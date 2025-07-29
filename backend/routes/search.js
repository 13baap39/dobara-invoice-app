/**
 * Advanced Search Routes for Orders
 * Implements complex search functionality with MongoDB aggregation
 */

import express from 'express';
import Order from '../models/Order.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route GET /api/orders/search
 * @description Advanced search for orders with multiple filters
 * @access Private (requires authentication)
 * @query {string} customerName - Partial match for customer name
 * @query {string} customerCity - Partial match for customer city
 * @query {string} startDate - Start date for order date range (YYYY-MM-DD)
 * @query {string} endDate - End date for order date range (YYYY-MM-DD)
 * @query {string} orderNumber - Exact match for order number
 * @query {string} skuContains - Partial match within SKU array
 * @query {number} minAmount - Minimum total amount
 * @query {number} maxAmount - Maximum total amount
 * @query {string} hsnCode - Exact match for HSN code
 * @query {string} sortBy - Sort field (orderDate, totalAmount, customerName)
 * @query {string} sortOrder - Sort order (asc, desc)
 * @query {number} page - Page number for pagination
 * @query {number} limit - Number of results per page
 */
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const {
      customerName,
      customerCity,
      startDate,
      endDate,
      orderNumber,
      skuContains,
      minAmount,
      maxAmount,
      hsnCode,
      sortBy = 'orderDate',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    console.log('🔍 Advanced search request:', req.query);

    // Build aggregation pipeline
    const pipeline = [];

    // Match stage - filter by user and basic criteria
    const matchStage = {
      userId: req.user.id
    };

    // Add search filters
    if (customerName) {
      matchStage.customerName = { $regex: customerName, $options: 'i' };
    }

    if (customerCity) {
      matchStage.customerCity = { $regex: customerCity, $options: 'i' };
    }

    if (orderNumber) {
      matchStage.orderNumber = orderNumber;
    }

    if (hsnCode) {
      matchStage.hsnCode = hsnCode;
    }

    // Date range filter
    if (startDate || endDate) {
      matchStage.orderDate = {};
      if (startDate) {
        matchStage.orderDate.$gte = new Date(startDate);
      }
      if (endDate) {
        // Add one day to include the end date
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        matchStage.orderDate.$lt = endDateTime;
      }
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      matchStage.totalAmount = {};
      if (minAmount) {
        matchStage.totalAmount.$gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        matchStage.totalAmount.$lte = parseFloat(maxAmount);
      }
    }

    // SKU contains filter (search within SKU array)
    if (skuContains) {
      matchStage['skus.sku'] = { $regex: skuContains, $options: 'i' };
    }

    pipeline.push({ $match: matchStage });

    // Add fields for search result highlighting and metadata
    pipeline.push({
      $addFields: {
        searchScore: {
          $add: [
            // Score based on exact matches
            { $cond: [{ $eq: ['$orderNumber', orderNumber || ''] }, 10, 0] },
            { $cond: [{ $eq: ['$hsnCode', hsnCode || ''] }, 5, 0] },
            // Score based on partial matches
            customerName ? { $cond: [{ $regexMatch: { input: '$customerName', regex: customerName, options: 'i' } }, 3, 0] } : 0,
            customerCity ? { $cond: [{ $regexMatch: { input: '$customerCity', regex: customerCity, options: 'i' } }, 2, 0] } : 0,
            skuContains ? { $cond: [{ $anyElementTrue: { $map: { input: '$skus', as: 'sku', in: { $regexMatch: { input: '$$sku.sku', regex: skuContains, options: 'i' } } } } }, 2, 0] } : 0
          ]
        },
        totalSkus: { $size: { $ifNull: ['$skus', []] } },
        // Add formatted date for display
        formattedDate: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$orderDate'
          }
        }
      }
    });

    // Count total results before pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    
    // Sort stage
    const sortStage = {};
    sortStage[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Add secondary sort by search score for relevance
    if (sortBy !== 'searchScore') {
      pipeline.push({ $sort: { searchScore: -1, ...sortStage } });
    } else {
      pipeline.push({ $sort: sortStage });
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    // Execute search and count queries
    const [searchResults, countResults] = await Promise.all([
      Order.aggregate(pipeline),
      Order.aggregate(countPipeline)
    ]);

    const total = countResults[0]?.total || 0;
    const totalPages = Math.ceil(total / parseInt(limit));

    console.log(`✅ Search completed: ${searchResults.length} results, ${total} total`);

    res.json({
      success: true,
      data: searchResults,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      searchMetadata: {
        query: req.query,
        resultsCount: searchResults.length,
        totalMatches: total
      }
    });

  } catch (error) {
    console.error('❌ Advanced search error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      query: req.query 
    });
  }
});

/**
 * @route GET /api/orders/search/suggestions
 * @description Get search suggestions for autocomplete
 * @access Private (requires authentication)
 */
router.get('/search/suggestions', authMiddleware, async (req, res) => {
  try {
    const { field, query } = req.query;

    if (!field || !query) {
      return res.json({ suggestions: [] });
    }

    let suggestions = [];

    switch (field) {
      case 'customerName':
        suggestions = await Order.distinct('customerName', {
          userId: req.user.id,
          customerName: { $regex: query, $options: 'i' }
        }).limit(10);
        break;
      
      case 'customerCity':
        suggestions = await Order.distinct('customerCity', {
          userId: req.user.id,
          customerCity: { $regex: query, $options: 'i' }
        }).limit(10);
        break;
      
      case 'skuContains':
        const skuResults = await Order.aggregate([
          { $match: { userId: req.user.id } },
          { $unwind: '$skus' },
          { $match: { 'skus.sku': { $regex: query, $options: 'i' } } },
          { $group: { _id: '$skus.sku' } },
          { $limit: 10 }
        ]);
        suggestions = skuResults.map(r => r._id);
        break;
      
      default:
        suggestions = [];
    }

    res.json({ suggestions: suggestions.filter(s => s && s.trim()) });
  } catch (error) {
    console.error('❌ Search suggestions error:', error);
    res.json({ suggestions: [] });
  }
});

export default router;
