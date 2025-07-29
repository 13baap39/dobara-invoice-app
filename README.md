# Dobara

Dobara is a full-stack web application for processing Meesho invoices, tracking customer orders, detecting repeat customers, and providing analytics via a React dashboard.

## Tech Stack
- Frontend: React (Vite), TailwindCSS, Axios, React Router, Recharts
- Backend: Node.js (ESM), Express, Multer, MongoDB (Mongoose), pdf-parse
- Database: MongoDB (dobara database, orders collection)

## Features
- Upload and parse Meesho PDF invoices
- **NEW**: Store invoice images with cloud or local storage
- **NEW**: View invoice thumbnails and full PDF previews
- Track customer orders with enhanced multi-SKU support
- Detect repeat customers
- Analytics: city-wise, revenue, totals, repeat customers
- Modern dashboard UI with invoice storage

## Local Development
- Frontend: http://localhost:5173
- Backend: http://localhost:5002

## Setup
1. Run `npm install` in the project root to install frontend dependencies.
2. Backend and additional setup instructions will be provided in backend folder.

## Project Structure
- `/src` - React frontend code
- `/backend` - Node.js backend (to be created)

## Instructions
Follow the copilot-instructions.md for workspace-specific guidance.
