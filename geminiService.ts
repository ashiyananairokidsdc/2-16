
import { GoogleGenAI } from "@google/genai";
import { TreatmentStep, PatientRecord } from "./types.ts";

/**
 * 歯科専門AIアドバイザーによる症例分析
 */
export const analyzeStepData = async (patient: PatientRecord, step: TreatmentStep) => {
  try {
    // 1. 環境変数の取得（ビルドツールによる置換を避けるための複数の試行）
    // 通常の参照
    let apiKey = process.env.API_KEY;
    
    // 万が一、Dashboard設定がファイル設定に負けている場合、
    // ここで取得される値が "PLACEHOLDER_API_KEY" になっている。
    
    apiKey = apiKey?.trim().replace(/['"]/g, '');

    if (!apiKey || apiKey === "PLACEHOLDER_API_KEY" || apiKey.includes("PLACEHOLDER")) {
      throw new Error(`【コード内またはビルド設定にダミー値を発見】
現在、システムが読み込んでいるキーは "${apiKey}" です。

あなたがVercelのDashboardで正しいキーを入力しているにも関わらずこの値になる場合、
以下の『ソースコード側のファイル』に古い設定が残っていて、Dashboardの設定を上書き（シャドウイング）しています：

■ 調査すべき場所:
1. プロジェクトのルートにある『.env』という名前のファイル（もしあれば中身を確認してください）
2. 『vercel.json』または『package.json』内の 'env' セクション
3. もしGitHubを使っているなら、GitHub上のコードに '.env' が含まれていないか

これらに "PLACEHOLDER_API_KEY" という記述があれば、それを削除してコミット・プッシュしてください。`);
    }

    const keyLength = apiKey.length;
    if (keyLength < 25) {
      throw new Error(`読み込まれたキーが短すぎます（${keyLength}文字）。
これはGoogle AI Studioのキー（通常39文字）ではなく、別の何かのキー、あるいは途中で切れた文字列です。
ソースコード内で 'API_KEY' という変数名が、他のライブラリ（Firebase等）と衝突していないか確認してください。`);
    }

    // 2. AIクライアントの初期化
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
    console.error("AI Configuration Error:", error);
    return `【診断レポート】
原因: ${error.message}

※VercelのDashboard設定は正しいとのことですので、プロジェクトのフォルダ内（VS Code等）で "PLACEHOLDER_API_KEY" という文字列を全ファイル検索してみてください。必ずどこかのファイルに隠れています。`;
  }
};
