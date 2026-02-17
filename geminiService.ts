
import { GoogleGenAI } from "@google/genai";
import { TreatmentStep, PatientRecord } from "./types.ts";

/**
 * 歯科専門AIアドバイザーによる症例分析
 */
export const analyzeStepData = async (patient: PatientRecord, step: TreatmentStep) => {
  try {
    // 1. 環境変数の取得
    let apiKey = process.env.API_KEY;

    // 2. 前後の不要な記号や空白を完全に除去
    apiKey = apiKey?.trim().replace(/['"]/g, '');

    // 3. 特殊なケース：プレースホルダー（ダミー文字）のチェック
    const isPlaceholder = apiKey === "PLACEHOLDER_API_KEY" || apiKey?.includes("PLACEHOLDER");

    if (isPlaceholder) {
      throw new Error(`【ダミー設定が検出されました】
現在、環境変数 API_KEY の値が本物のキーではなく、"${apiKey}" という『仮の文字列』になっています。

■ 対処法：
Vercelの『Settings > Environment Variables』を確認してください。
'API_KEY' という名前の設定が複数ありませんか？
また、その値が間違いなく 'AIza...' で始まっているか、もう一度上書きして保存し、『Redeploy』を実行してください。`);
    }

    // 4. 長さチェック
    const keyLength = apiKey?.length || 0;
    if (!apiKey || keyLength < 25) {
      const keyHint = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : "なし";
      throw new Error(`APIキーが正しく読み込めていません。
現在の値: ${apiKey} (長さ: ${keyLength}文字)

正しいキーを設定しているはずなのにこのエラーが出る場合、Vercel側で『Production』以外の環境（Preview等）にチェックが入っていない可能性があります。`);
    }

    // 5. AIクライアントの初期化（ここまで来れば正規のキーのはず）
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
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
      text: `歯科臨床アドバイザーとして以下の処置内容を分析し、日本語でアドバイスしてください。
患者: ${patient.name} 様 / 特記事項: ${patient.profileNotes || "特になし"}
工程: ${step.label}
実施メモ: ${step.notes || "なし"}`
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
    });

    return response.text;
    
  } catch (error: any) {
    console.error("AI Analysis Critical Error:", error);
    
    return `【設定の不整合を検出】
${error.message}

※Vercelの画面で、今一度 'API_KEY' の値そのものをコピー＆ペーストし直して保存し、再デプロイしてください。`;
  }
};
