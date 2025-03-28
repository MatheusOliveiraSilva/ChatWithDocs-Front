import React, { useState, useEffect } from 'react';
import documentService from '../services/documentService';
import '../styles/DocumentProgressBar.css';

interface DocumentProgressBarProps {
  documentId: number;
  onProgressComplete?: () => void;
}

const DocumentProgressBar: React.FC<DocumentProgressBarProps> = ({ 
  documentId,
  onProgressComplete
}) => {
  const [progress, setProgress] = useState(0);
  const [chunksIndexed, setChunksIndexed] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [isPolling, setIsPolling] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const MAX_RETRIES = 50; // About 5 minutes (with 6 seconds interval)
  const STALL_THRESHOLD = 60000; // 60 seconds without updates is considered stalled

  // Function to handle completion of progress
  const handleProgressComplete = () => {
    console.log("Document processing complete, updating UI");
    if (onProgressComplete) {
      // Delay the callback slightly to ensure state updates have propagated
      setTimeout(() => {
        onProgressComplete();
      }, 500);
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let progressTimeout: NodeJS.Timeout | null = null;

    const fetchProgress = async () => {
      try {
        const progressData = await documentService.getDocumentProgress(documentId);
        
        // Check if there has been progress since the last check
        const hasProgressed = progressData.progress > progress || 
                             progressData.chunks_indexed > chunksIndexed;

        // Update progress if there is valid data
        if (progressData.progress >= 0) {
          setProgress(progressData.progress);
        }
        
        if (progressData.chunks_indexed > 0) {
          setChunksIndexed(progressData.chunks_indexed);
        }
        
        if (progressData.total_chunks > 0) {
          setTotalChunks(progressData.total_chunks);
        }
        
        // Record the time of the last update if there is progress
        if (hasProgressed) {
          setLastUpdateTime(Date.now());
          // Reset retry counter when there is progress
          setRetryCount(0);
        } else {
          // Increment retry counter without progress
          setRetryCount(prev => prev + 1);
        }
        
        // Check if processing is completed
        if (progressData.progress === 100 || progressData.status === 'completed') {
          setIsPolling(false);
          handleProgressComplete();
        }
        
        // Check if the document failed during processing
        if (progressData.status === 'failed') {
          setIsPolling(false);
          console.error("Document failed during processing:", progressData.error_message);
          handleProgressComplete();
        }
        
      } catch (error) {
        console.error("Error fetching document progress", error);
        setRetryCount(prev => prev + 1);
        
        // If we have consecutive errors, try a longer delay before the next attempt
        if (retryCount > 5) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Additional delay
        }
      }

      // Check if exceeded the maximum number of retries
      if (retryCount >= MAX_RETRIES) {
        console.warn(`Stopping polling after ${MAX_RETRIES} attempts without progress`);
        setIsPolling(false);
        
        // Force a final document update
        handleProgressComplete();
      }
      
      // Check if processing is stalled
      const timeSinceLastUpdate = Date.now() - lastUpdateTime;
      if (timeSinceLastUpdate > STALL_THRESHOLD && progress > 0 && progress < 100) {
        console.warn("Processing appears to be stalled, forcing an update");
        
        // Force a reprocessing attempt after 1 minute without updates
        try {
          // Check the current document status
          const document = await documentService.getDocument(documentId);
          
          if (document.index_status === 'processing') {
            console.log("Attempting to restart the stalled document processing");
            // Instead of trying to reprocess, we just force a UI update
            // This is safer than trying to reprocess a document that's already processing
            handleProgressComplete();
          }
        } catch (reprocessError) {
          console.error("Error checking possibly stalled document", reprocessError);
          // In case of error, we also force an update
          handleProgressComplete();
        }
        
        // Reset the stall timer
        setLastUpdateTime(Date.now());
      }
    };

    // Fetch progress immediately
    fetchProgress();
    
    // And then start polling
    if (isPolling) {
      intervalId = setInterval(fetchProgress, 6000); // Check every 6 seconds
      
      // Safety timeout to ensure polling doesn't continue indefinitely
      progressTimeout = setTimeout(() => {
        console.warn("Safety timeout triggered to prevent infinite polling");
        setIsPolling(false);
        handleProgressComplete();
      }, 10 * 60 * 1000); // 10 minutes timeout (reduced from 15 to 10)
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (progressTimeout) {
        clearTimeout(progressTimeout);
      }
    };
  }, [documentId, isPolling, progress, chunksIndexed, retryCount, lastUpdateTime]);

  // Check if there is actual progress to show the bar
  const hasActualProgress = progress > 0;
  
  // Calculate if we should show percentage or chunks
  const shouldShowChunks = totalChunks > 0 && chunksIndexed > 0;

  // If progress is 0%, don't show the bar
  if (!hasActualProgress) {
    return (
      <div className="document-progress-container">
        <div className="document-progress-text document-progress-waiting">
          <span className="document-progress-spinner"></span>
          <span>Preparing document for indexing...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="document-progress-container">
      <div className="document-progress-bar">
        <div 
          className="document-progress-fill" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="document-progress-text">
        {shouldShowChunks ? (
          <span>
            {progress}% - {chunksIndexed}/{totalChunks} chunks indexed
          </span>
        ) : (
          <span>{progress}% indexed</span>
        )}
      </div>
    </div>
  );
};

export default DocumentProgressBar; 