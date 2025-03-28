import OpenAI from 'openai';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true // This allows API calls from the browser, use with caution in production
});

/**
 * Generates a concise conversation summary (3-4 words) based on the first message
 * @param message - The first message from the user to summarize
 * @returns A promise that resolves to a short summary string
 */
const generateConversationSummary = async (message: string): Promise<string> => {
  try {
    if (!API_KEY) {
      console.warn('OpenAI API key is not set. Using fallback summary method.');
      return generateFallbackSummary(message);
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates very concise conversation titles. " + 
                   "Create a summary of the user's message in just 3-4 words. " +
                   "The summary should capture the essence of what the user is talking about. " +
                   "Return ONLY the summary without quotes or any other text."
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 10
    });

    // Get the summary from the response
    const summary = response.choices[0]?.message?.content?.trim() || generateFallbackSummary(message);
    
    return summary;
  } catch (error) {
    console.error('Error generating conversation summary:', error);
    return generateFallbackSummary(message);
  }
};

/**
 * Fallback method to generate a summary when the API call fails
 * @param message - The user message to summarize
 * @returns A simple truncated summary
 */
const generateFallbackSummary = (message: string): string => {
  // Simple fallback that takes the first 30 characters or truncates to 4 words
  const words = message.split(' ');
  
  if (words.length <= 4) {
    return message.length > 30 ? message.substring(0, 30) + '...' : message;
  }
  
  return words.slice(0, 4).join(' ') + (words.length > 4 ? '...' : '');
};

const openaiService = {
  generateConversationSummary
};

export default openaiService; 