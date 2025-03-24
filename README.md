# ChatWithDocuments Frontend

A modern web application that allows users to chat intelligently with their documents. This frontend application connects to a FastAPI backend service for document processing and chat functionality.

## Features

- Dark mode modern UI
- Authentication via Auth0
- Chat with documents using AI
- Document source tracking
- Conversation history

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

3. Configure environment variables
   - Copy `.env.example` to `.env`
   ```bash
   cp .env.example .env
   ```
   - Edit `.env` file with appropriate values:
     - `VITE_API_URL`: URL of the backend API (default: http://0.0.0.0:5005)
     - `VITE_FRONTEND_URL`: URL of the frontend application (default: http://localhost:5173)

4. Start the development server
   ```bash
   npm run dev
   ```

## Authentication Setup

To ensure proper authentication:

1. **Backend Configuration**: The backend API must be configured to accept redirect URIs from the frontend application. Make sure the backend Auth0 configuration includes `http://localhost:5173/auth/callback` (or your frontend URL) as an allowed callback URL.

2. **Auth0 Configuration**: In your Auth0 Dashboard, you need to add the frontend URL (`http://localhost:5173`) to the "Allowed Web Origins" and `http://localhost:5173/auth/callback` to the "Allowed Callback URLs".

## Building for Production

```bash
npm run build
```

The build output will be in the `dist` folder ready for deployment.

## Technology Stack

- React
- TypeScript
- Vite
- React Router for navigation
- Axios for API requests
- CSS for styling (minimalist design)
