import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

// Get all available keys from environment
const getApiKeys = () => {
  const keys = [
    process.env.GEMINI_API_KEY, // Platform injected key
    process.env.API_KEY,
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
  ].filter(Boolean) as string[];
  
  // Handle comma-separated keys in GEMINI_API_KEY
  const expandedKeys: string[] = [];
  keys.forEach(k => {
    if (k.includes(',')) {
      expandedKeys.push(...k.split(',').map(s => s.trim()).filter(Boolean));
    } else {
      expandedKeys.push(k.trim());
    }
  });

  // Remove duplicates
  return Array.from(new Set(expandedKeys));
};

export const getAI = (apiKey?: string) => {
  const keys = getApiKeys();
  const key = apiKey || keys[0];
  if (!key) {
    throw new Error("Gemini API key is not set. Please add GEMINI_API_KEY in Secrets.");
  }
  return new GoogleGenAI({ apiKey: key });
};

/**
 * Robust wrapper to handle Rate Limits (429) by rotating API keys and falling back to lighter models.
 */
export async function smartGenerateContent(params: {
  preferredModel: string;
  fallbackModels: string[];
  contents: any;
  config?: any;
}) {
  const keys = getApiKeys();
  const models = [params.preferredModel, ...params.fallbackModels];
  
  let lastError: any = null;

  // Try each model in order of preference
  for (const modelName of models) {
    // For each model, try all available API keys
    for (const key of keys) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (error: any) {
        lastError = error;
        const errorMsg = error.message?.toLowerCase() || "";
        
        // If it's a rate limit error (429) or auth error (401), try the next key
        const isRetryable = errorMsg.includes("429") || 
                           errorMsg.includes("resource_exhausted") || 
                           errorMsg.includes("quota") || 
                           errorMsg.includes("rate exceeded") || 
                           errorMsg.includes("rate_limit") ||
                           errorMsg.includes("401") ||
                           errorMsg.includes("unauthorized") ||
                           errorMsg.includes("invalid api key");

        if (isRetryable) {
          console.warn(`Retryable error for model ${modelName} with key ending in ...${key.slice(-4)}. Trying next key...`);
          continue; 
        }
        
        // If it's a model not found or not supported error, break key loop and try next model
        if (errorMsg.includes("not found") || errorMsg.includes("not supported") || errorMsg.includes("invalid model")) {
          console.warn(`Model ${modelName} not supported. Trying next model...`);
          break; 
        }

        // For other errors, we might want to try another key too, but let's be cautious
        console.error(`Error with model ${modelName}:`, error);
        continue;
      }
    }
  }

  throw lastError || new Error("All API keys and fallback models failed.");
}

export async function generateOptimizedPrompt(systemInstruction: string, userInput: string, images: string[] = [], config: any = {}) {
  const parts: any[] = [{ text: userInput }];
  
  // Add image parts if provided
  for (const img of images) {
    if (img && img.startsWith('data:image/')) {
      const [mimeType, data] = img.split(';base64,');
      parts.push({
        inlineData: {
          mimeType: mimeType.split(':')[1],
          data: data
        }
      });
    }
  }

  try {
    const response = await smartGenerateContent({
      preferredModel: config.preferredModel || "gemini-3-flash-preview",
      fallbackModels: ["gemini-3-flash-preview", "gemini-flash-latest", "gemini-flash-lite-latest"],
      contents: [{ role: "user", parts: parts }],
      config: {
        systemInstruction: systemInstruction,
        temperature: config.temperature || 0.7,
        responseMimeType: config.responseMimeType,
        responseSchema: config.responseSchema,
      },
    });
    
    return response.text || "Failed to generate content.";
  } catch (error: any) {
    return `Error: ${error.message || String(error)}`;
  }
}

export async function generateImage(prompt: string, images: string[] = []) {
  const parts: any[] = [{ text: prompt }];
  
  // Add image parts if provided for image-to-image editing
  for (const img of images) {
    if (img && img.startsWith('data:image/')) {
      const [mimeType, data] = img.split(';base64,');
      parts.push({
        inlineData: {
          mimeType: mimeType.split(':')[1],
          data: data
        }
      });
    }
  }

  try {
    const response = await smartGenerateContent({
      preferredModel: 'gemini-2.5-flash-image',
      fallbackModels: ['gemini-2.0-flash-exp'],
      contents: { parts: parts },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString: string = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
    throw new Error("No image data in response.");
  } catch (error: any) {
    throw error;
  }
}
