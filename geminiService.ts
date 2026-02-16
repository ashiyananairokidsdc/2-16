
import { GoogleGenAI } from "@google/genai";
import { TreatmentStep, PatientRecord } from "./types.ts";

export const analyzeStepData = async (patient: PatientRecord, step: TreatmentStep) => {
  // process.env.API_KEY は実行環境の「Secrets」設定から自動的に読み込まれます
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey.includes("YOUR_API_KEY")) {
    return "【設定エラー】APIキーが見つかりません。画面右側の「Secrets」タブで、Nameに 'API_KEY'、Valueに提供されたキーを入力して保存してください。";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const images = step.files.filter(f => f.type === 'image').slice(0, 3);
    const parts: any[] = [];
    
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

    parts.push({
      text: `歯科臨床アドバイザーとして、以下の情報を分析し、専門的なアドバイスを日本語の箇条書きで提供してください。

患者名: ${patient.name}
現在の工程: ${step.label}
処置メモ: ${step.notes || "（なし）"}
特記事項: ${patient.profileNotes || "（なし）"}

分析項目:
1. 現在の口腔状態の評価と、処置の適切性。
2. 画像（ある場合）から推測される炎症や清掃状態。
3. 次のステップ（再評価やSRP等）へ進むための具体的な基準。
4. 患者への説明で使える、モチベーション向上のためのフレーズ。`
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts }],
    });

    return response.text || "解析結果が空でした。再度お試しください。";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes("API key")) {
      return "【APIキーエラー】設定されたキーが無効です。Secretsに正しいキーが保存されているか確認してください。";
    }
    return `【解析失敗】通信エラーが発生しました。インターネット接続を確認してください。(${error.message || "Unknown error"})`;
  }
};
