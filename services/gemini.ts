import { GoogleGenAI, Modality } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.API_KEY || '';
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
  }

  async editImage(
    base64Image: string, 
    prompt: string,
    mimeType: string = 'image/png'
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error("API Key not found. Please set the API_KEY environment variable.");
    }

    try {
      // Remove header if present (e.g., "data:image/png;base64,")
      const cleanBase64 = base64Image.split(',')[1] || base64Image;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts && parts.length > 0) {
        const part = parts[0];
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      throw new Error("No image generated in response.");
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      throw new Error(error.message || "Failed to process image with Gemini.");
    }
  }
}

export const geminiService = new GeminiService();
