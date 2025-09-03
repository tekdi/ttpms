#!/bin/bash

echo "🚀 Starting TPPMS React Frontend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if backend is running
echo "🔍 Checking backend connection..."
if curl -s http://127.0.0.1:8000/api/ > /dev/null; then
    echo "✅ Backend is running on http://127.0.0.1:8000"
else
    echo "⚠️  Warning: Backend is not running on http://127.0.0.1:8000"
    echo "   Please start the backend server first:"
    echo "   cd ../backend && python main.py"
    echo ""
fi

echo "🌐 Starting development server..."
echo "📱 Frontend will be available at: http://localhost:5173"
echo "🔑 Test credentials: bhavesh.korane@tekditechnologies.com (any password)"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the development server
npm run dev
