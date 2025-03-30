# ChatWithDocs - Frontend

This is the frontend application for ChatWithDocs, an interface to interact with documents through an intelligent chatbot.

Access the application at: https://chatwithdocs-front.vercel.app

## What is ChatWithDocs?

ChatWithDocs is an application that allows you to chat with your documents! You upload your files (PDFs, documents, etc.) and the system indexes them, enabling you to ask questions about their content through an intelligent chat interface.

## Architecture Diagram

[Placeholder for system architecture image]

## Main Components

### Login Screen

- Simple and straightforward user authentication page
- Uses secure authentication via external API
- Redirects to chat after successful login

### Chat Management

- Side panel showing all your conversations
- Easy navigation between different conversation topics
- Create new conversations with a single click
- View complete history of each conversation

### Document Upload System

- Supports file uploads via button or drag and drop
- Shows document processing progress
- Displays indexing status (pending, processing, completed, failed)
- Allows reprocessing of failed documents

### Chat Interface

- Intuitive chat similar to other modern applications
- Input field to type your questions
- Responses formatted with markdown for better visualization
- Code highlighting for technical snippets
- Display of documents that were used to answer your question

### AI Model Configuration

- Choose between different AI models (OpenAI, Anthropic)
- Adjust parameters like temperature and reasoning effort
- Thinking mode to visualize the AI's reasoning process

## How It Works

1. **Login**: Log in to access your conversations and documents
2. **Document Upload**: Upload your documents through the button or by dragging and dropping
3. **Indexing**: Wait while the system processes and indexes your documents (visible through a progress bar)
4. **Ask**: Type your questions about the documents
5. **Get Answers**: Receive intelligent answers based on the content of your documents

The system uses RAG (Retrieval Augmented Generation) technology to retrieve relevant information from your documents. All uploaded documents are indexed in a Pinecone database for fast and efficient semantic search.

## Backend Connection

This frontend connects to a Python API that:
- Manages user authentication
- Processes and indexes documents
- Stores documents in cloud storage service
- Indexes document content in Pinecone
- Performs semantic searches on documents
- Generates contextualized responses using AI models

## Technologies Used

- React 19
- TypeScript
- Chakra UI for interface components
- React Router for navigation
- Axios for API communication
- Vite as build tool

## How to Run Locally

1. **Clone the repository**
   ```
   git clone [REPOSITORY_URL]
   cd ChatWithDocs-Front
   ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Configure environment variables**
   Copy the `.env.example` file to `.env` and fill in the necessary variables:
   ```
   cp .env.example .env
   ```
   
   Edit the `.env` file with:
   ```
   VITE_API_URL=http://localhost:5005  # Backend API URL
   VITE_FRONTEND_URL=http://localhost:5173  # Local frontend URL
   ```

4. **Start the development server**
   ```
   npm run dev
   ```

5. **Access the application**
   Open your browser and go to `http://localhost:5173`

Remember that you will need to have the backend running for the application to work completely.
