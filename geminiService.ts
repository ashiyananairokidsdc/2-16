
import { GoogleGenAI } from "@google/genai";
import { TreatmentStep, PatientRecord } from "./types.ts";

/**
 * 歯科専門AIアドバイザーによる症例分析
 */
export const analyzeStepData = async (patient: PatientRecord, step: TreatmentStep) => {
  try {
    // Vercelから渡される環境変数を取得
    let apiKey = process.env.API_KEY;

    // 前後の空白や見えない文字を徹底的に除去
    apiKey = apiKey?.trim().replace(/['"]/g, '');

    // デバッグ用のヒント（最初と最後の4文字だけ抽出）
    const keyHint = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : "なし";
    const keyLength = apiKey?.length || 0;

    // 診断: キーが明らかに短い（Geminiのキーは通常39文字程度です）
    if (!apiKey || keyLength < 25) {
      throw new Error(`APIキーが正しく読み込めていません。
現在の長さ: ${keyLength}文字
現在のキーの断片: ${keyHint}

【確認してください】
あなたが設定したキー (${keyLength}文字) は短すぎます。Geminiのキーは通常39文字です。
Vercelの環境変数 'API_KEY' に、途中で切れていない正しいキーが保存されているか再確認してください。`);
    }

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
      text: `歯科臨床アドバイザーとして分析してください。
患者: ${patient.name} 様
工程: ${step.label}
メモ: ${step.notes || "なし"}`
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
    });

    return response.text;
    
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    
    // エラーメッセージの構築
    const apiKey = process.env.API_KEY?.trim() || "";
    const keyHint = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : "未設定";

    return `【設定エラー】AIが起動できません。

■ 現在の状況：
・認識しているキーの長さ: ${apiKey.length}文字
・キーの断片: ${keyHint}

■ 解決のためのチェック：
1. 表示されている『キーの断片』は、あなたが Google AI Studio で取得したキーと一致しますか？
2. もし一致しない、あるいは短すぎる場合、Vercelの『Settings > Environment Variables』で 'API_KEY' の値を一度削除し、もう一度丁寧に貼り付け直してください。
3. 貼り付け直し、保存した後、必ず【Deployments画面からRedeploy】を実行してください。

詳細エラー: ${error.message}`;
  }
};
