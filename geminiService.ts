
import { GoogleGenAI } from "@google/genai";
import { TreatmentStep, PatientRecord } from "./types.ts";

export const analyzeStepData = async (patient: PatientRecord, step: TreatmentStep) => {
  // 1. 全ての可能性を確認
  const envKey = process.env.API_KEY;
  
  // デバッグ用情報の構築
  let debugStatus = "";
  if (typeof envKey === "undefined") debugStatus = "型: undefined (存在しません)";
  else if (envKey === null) debugStatus = "型: null (空です)";
  else if (envKey === "") debugStatus = "型: string (空文字です)";
  else {
    const safeDisplay = String(envKey).substring(0, 4);
    debugStatus = `型: string, 長さ: ${String(envKey).length}文字, 先頭4文字: 「${safeDisplay}」`;
  }

  // 2. クリーニング
  const apiKey = String(envKey || "").trim().replace(/^["']|["']$/g, "");

  // 3. 判定と詳細エラー表示
  if (!apiKey || apiKey === "undefined" || apiKey === "null" || !apiKey.startsWith("AIza")) {
    return `【徹底診断：APIキーが正しく認識されていません】

■ システムが検知した現在の状況:
${debugStatus}

■ 考えられる原因と対策:
1. 【最有力】コードがまだ更新されていない
   → この「徹底診断」という文字が表示されているなら、コードは最新です。
2. 【Vercelの設定ミス】
   → Environment Variables の Name が「API_KEY」(全て大文字) であるか再確認してください。
3. 【ビルドの未反映】
   → Vercelの「Deployments」メニューから、最新のデプロイの右側にある「...」を押し、「Redeploy」を実行してください。その際「Existing Build Cache」を使わない設定があればそちらを選んでください。

※もし先頭4文字が「AIza」以外（例: proc... など）の場合、ビルドツールが環境変数を文字列として埋め込めていない可能性があります。`;
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
      text: `歯科専門AIアドバイザーとして分析してください。
患者: ${patient.name}
工程: ${step.label}
メモ: ${step.notes}`
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts }],
    });

    return response.text || "AIの回答が空でした。";
    
  } catch (error: any) {
    return `【API実行エラー】\n${error.message}`;
  }
};
