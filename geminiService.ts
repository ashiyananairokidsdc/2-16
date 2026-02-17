
import { GoogleGenAI } from "@google/genai";
import { TreatmentStep, PatientRecord } from "./types.ts";

/**
 * 歯科専門AIアドバイザーによる症例分析
 */
export const analyzeStepData = async (patient: PatientRecord, step: TreatmentStep) => {
  try {
    // Vercelから渡される環境変数を取得
    let apiKey = process.env.API_KEY;

    // 前後の空白文字や改行を完全に除去（コピーミス対策）
    apiKey = apiKey?.trim();

    // 診断1: キーが存在しない
    if (!apiKey || apiKey === "undefined" || apiKey === "") {
      throw new Error("APIキーが見つかりません。VercelのEnvironment Variablesに 'API_KEY' が設定されているか、設定後に『Redeploy』したか確認してください。");
    }

    // 診断2: キーが短すぎる
    if (apiKey.length < 20) {
      throw new Error(`設定されているキーが短すぎます（現在の長さ: ${apiKey.length}文字）。正しいキーをコピーできているか確認してください。`);
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // 画像データの抽出
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
      text: `あなたは歯科臨床アドバイザーです。以下の内容を分析しアドバイスしてください。
患者情報: ${patient.name} 様 / ${patient.profileNotes || "特になし"}
工程: ${step.label}
メモ: ${step.notes || "なし"}`
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
    });

    return response.text;
    
  } catch (error: any) {
    console.error("Critical AI Error:", error);
    
    // 特定のエラーに対する詳細なガイド
    if (error.message.includes("API key not valid") || error.message.includes("400")) {
      return `【APIキー無効】認証に失敗しました。

■ 可能性が高い原因：
「Firebaseのキー」を Geminiのキーとして設定していませんか？

■ 解決策：
1. Google AI Studio (aistudio.google.com) の『Get API key』から取得したキーを使っているか再確認。
2. Vercelで API_KEY を保存した後、必ず【Redeploy（再デプロイ）】を完了させてください。

※現在のアプリが認識しているキーの長さ: ${process.env.API_KEY?.trim()?.length || 0}文字`;
    }

    return `【システムエラー】
${error.message}`;
  }
};
