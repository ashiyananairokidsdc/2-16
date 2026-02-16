
import { GoogleGenAI } from "@google/genai";
import { TreatmentStep, PatientRecord } from "./types.ts";

export const analyzeStepData = async (patient: PatientRecord, step: TreatmentStep) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const images = step.files.filter(f => f.type === 'image').slice(0, 3);
    const parts: any[] = [];
    
    images.forEach(img => {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: img.url.split(',')[1],
        }
      });
    });

    parts.push({
      text: `歯科医師・衛生士の助手として、患者「${patient.name}」の治療工程「${step.label}」について分析してください。
現在のメモ: ${step.notes}

指示事項:
1. 処置の適切性へのコメント
2. 写真から見える改善点
3. 次のステップへの移行基準
4. 今後の注意点

回答は箇条書きで分かりやすく日本語で作成してください。`
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "分析に失敗しました。APIキーまたは通信状況を確認してください。";
  }
};
