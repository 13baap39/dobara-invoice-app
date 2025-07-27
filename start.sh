#!/bin/bash

echo "🚀 Starting Dobara Application..."
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

# Check if MongoDB is running
if ! pgrep mongod > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first."
    echo "   Run: brew services start mongodb/brew/mongodb-community"
    echo "   Or: sudo systemctl start mongod"
    exit 1
fi

# Create uploads directory if it doesn't exist
if [ ! -d "../uploads" ]; then
    echo "📁 Creating uploads directory..."
    mkdir -p ../uploads
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
else
    # Check if concurrently is installed
    if ! npm list concurrently > /dev/null 2>&1; then
        echo "📦 Installing concurrently for running both servers..."
        npm install concurrently --save-dev
    fi
fi

if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

echo "✅ All dependencies installed!"
echo "🌐 Starting servers..."
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:5002"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "================================"

# Start both servers
npm start
