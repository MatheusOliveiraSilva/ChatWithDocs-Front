# ChatWithDocuments Frontend

A modern web application that allows users to chat intelligently with their documents. This frontend application connects to a FastAPI backend service for document processing and chat functionality.

## Features

- Dark mode modern UI
- Chat with documents using AI
- Document upload and processing
- Conversation history
- Real-time streaming responses
- Multiple document formats support (PDF, DOCX, TXT, etc.)

## Setup and Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/ChatWithDocs-Front.git
   cd ChatWithDocs-Front
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment variables (optional)
   - Create a `.env` file in the root directory if you need to customize the API URL:
   ```bash
   # Backend API URL (default: http://localhost:8000)
   VITE_API_URL=http://localhost:8000
   ```
   - If no `.env` file is provided, the application will use `http://localhost:8000` as the default backend URL.

4. Start the development server
   ```bash
   npm run dev
   ```

## Environment Variables

- `VITE_API_URL`: URL of the backend API (default: `http://localhost:8000`)

## Building for Production

```bash
npm run build
```

The build output will be in the `dist` folder ready for deployment.

## Technology Stack

- React 18
- TypeScript
- Vite
- React Router for navigation
- Modern CSS for styling
- Real-time streaming with Server-Sent Events
