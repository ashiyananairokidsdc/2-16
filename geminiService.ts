
import { GoogleGenAI } from "@google/genai";
import { TreatmentStep, PatientRecord } from "./types.ts";

export const analyzeStepData = async (patient: PatientRecord, step: TreatmentStep) => {
  // 1. 環境変数の取得
  const envKey = process.env.API_KEY || "";
  const apiKey = envKey.trim().replace(/^["']|["']$/g, "");

  // 2. プレースホルダーまたは無効なキーの判定
  if (apiKey === "PLACEHOLDER_API_KEY" || !apiKey || !apiKey.startsWith("AIza")) {
    const isPlaceholder = apiKey === "PLACEHOLDER_API_KEY";
    
    return `【重要：APIキーの設定が必要です】

現在、${isPlaceholder ? "「仮のキー(PLACEHOLDER)」" : "「不適切な値」"}が読み込まれています。
Vercelの設定ではなく、今お使いの「このエディタ環境」にキーを教える必要があります。

■ 解決手順:
1. 画面左側のサイドバーにある 🔒 (Secrets / 鍵マーク) をクリック。
2. Name に 「API_KEY」 と入力。
3. Value に Google AI Studio で取得した 「AIza...」 で始まるキーを貼り付け。
4. 保存後、必ず『ブラウザをリロード(更新)』してください。

※Vercelの管理画面で設定した変数は、ここ（編集画面）には反映されません。`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
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
      text: `歯科専門AIアドバイザーとして以下の情報を分析し、日本語で回答してください。
患者: ${patient.name}
工程: ${step.label}
処置メモ: ${step.notes || "なし"}
患者特記事項: ${patient.profileNotes || "なし"}`
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts }],
    });

    return response.text || "AIからの応答が空でした。";
    
  } catch (error: any) {
    return `【API実行エラー】\n${error.message}`;
  }
};
