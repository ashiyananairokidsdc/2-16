
import { GoogleGenAI } from "@google/genai";
import { TreatmentStep, PatientRecord } from "./types.ts";

// Function to analyze patient data using Gemini AI
export const analyzeStepData = async (patient: PatientRecord, step: TreatmentStep) => {
  try {
    // Initialize Gemini API client as per guidelines.
    // The API key must be obtained from process.env.API_KEY.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    
    const images = step.files.filter(f => f.type === 'image').slice(0, 3);
    const parts: any[] = [];
    
    // Add image parts if available
    for (const img of images) {
      if (img.url.includes(',')) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: img.url.split(',')[1],
          }
        });
      }
    }

    // Add text prompt part
    parts.push({
      text: `歯科専門AIアドバイザーとして以下の情報を分析し、日本語で回答してください。
患者: ${patient.name}
工程: ${step.label}
処置メモ: ${step.notes || "なし"}
患者特記事項: ${patient.profileNotes || "なし"}`
    });

    // Use ai.models.generateContent to query the model
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
    });

    // Extract text output from response.text property
    return response.text || "AIからの応答が空でした。";
    
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Graceful error handling for API calls
    return `【分析エラー】AIとの通信中に問題が発生しました。しばらく待ってから再度お試しください。\n詳細: ${error.message}`;
  }
};
