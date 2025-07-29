#!/bin/bash

echo "🚀 Pushing Meesho Invoice Parser Fixes to GitHub..."
echo "=================================================="

# Add all changes
echo "📝 Adding changes to git..."
git add .

# Commit with detailed message
echo "💾 Committing changes..."
git commit -m "Fix critical issues in Meesho invoice parser

- Enhanced PDF extraction for customer details, HSN code, and city
- Implemented multi-SKU order detection and grouping
- Created improved data structure that groups SKUs by order
- Updated database schema to prevent duplicate customer entries
- Added robust validation and error handling"

# Push to GitHub
echo "🌐 Pushing changes to GitHub..."
git push origin main

echo "✅ Done! Changes have been pushed to GitHub."
