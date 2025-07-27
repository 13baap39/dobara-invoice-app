# Dobara Setup Instructions

## Quick Start (TL;DR)
```bash
# Make sure MongoDB is running, then:
./start.sh
```
Open http://localhost:5173 in your browser!

---

## Prerequisites
- Node.js (v18 or higher)
- MongoDB (running locally on port 27017)
- npm or yarn package manager

## Installation Steps

### 1. Install Frontend Dependencies
```bash
npm install
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### 3. Setup MongoDB
- Ensure MongoDB is running on `mongodb://localhost:27017`
- Database name: `dobara`
- Collections will be created automatically

### 4. Create Uploads Directory
```bash
mkdir -p ../uploads
```

### 5. Start the Application

You have several options to run both servers:

#### Option A: One-Click Startup Script (Easiest)
```bash
./start.sh
```
This script will:
- Check prerequisites
- Install dependencies if needed
- Create uploads directory
- Start both servers automatically

#### Option B: Single Command
```bash
# Install concurrently first (if not already installed)
npm install

# Run both servers simultaneously
npm start
```
This will start both frontend (port 5173) and backend (port 5002) in one terminal.

#### Option C: Two Separate Terminals
**Terminal 1 - Backend Server:**
```bash
cd backend
npm run dev
```
Backend will run on: http://localhost:5002

**Terminal 2 - Frontend Development Server:**
```bash
npm run dev
```
Frontend will run on: http://localhost:5173

#### Option D: Individual Commands
```bash
# Backend only
npm run dev:backend

# Frontend only  
npm run dev:frontend

# Both servers
npm run dev:both
```

## Environment Variables (Optional)
Create a `.env` file in the backend directory:
```
JWT_SECRET=your_secret_key_here
MONGO_URI=mongodb://localhost:27017/dobara
```

## Testing the Application
1. Open http://localhost:5173
2. Create a new account via signup
3. Upload sample PDF invoices from the "Daily bills" folder
4. View orders and analytics

## Common Issues
- **CORS errors**: Ensure backend is running on port 5002
- **Upload failures**: Check that ../uploads directory exists and is writable
- **PDF parsing errors**: Ensure PDFs are valid Meesho invoices
- **MongoDB connection**: Verify MongoDB service is running

## Project Structure
- `/src` - React frontend
- `/backend` - Node.js API server
- `/Daily bills` - Sample PDF invoices for testing
- `/uploads` - Profile picture storage (created during setup)
