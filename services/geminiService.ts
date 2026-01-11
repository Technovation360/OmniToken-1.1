
import { GoogleGenAI } from "@google/genai";

// Initialize the GoogleGenAI client with the API key from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateClinicSlogan = async (clinicName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 3 professional and catchy medical slogans for a clinic named "${clinicName}". Return as a comma-separated list.`,
    });
    // Accessing the text property directly from GenerateContentResponse
    return response.text || "Excellence in Care, Wellness for Life, Your Health Our Priority";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Healing Hands, Caring Hearts";
  }
};

export const getQueueInsights = async (tokenCount: number) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `A clinic currently has ${tokenCount} patients waiting in the queue. Provide 1-2 sentences of advice for the clinic administrator to manage the flow efficiently.`,
    });
    // Accessing the text property directly from GenerateContentResponse
    return response.text;
  } catch (error) {
    return "Keep patients informed about wait times to improve satisfaction.";
  }
};
