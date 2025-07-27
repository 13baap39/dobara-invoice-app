<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

Dobara Project Instructions:
- This is a full-stack web application for Meesho invoice processing, order tracking, repeat customer detection, and analytics.
- Frontend: React (Vite), TailwindCSS, Axios, React Router, Recharts.
- Backend: Node.js (ESM), Express, Multer, MongoDB (Mongoose), pdf-parse.
- Backend and frontend must run locally (localhost:5002 and localhost:5173).
- Use ES6 imports everywhere (no CommonJS).
- Each SKU in a bill is a separate MongoDB record.
- MongoDB database: dobara, collection: orders.
- Follow the provided API and feature plan for implementation.
