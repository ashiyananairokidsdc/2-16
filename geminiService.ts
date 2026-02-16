
import { GoogleGenAI } from "@google/genai";
import { TreatmentStep, PatientRecord } from "./types.ts";

export const analyzeStepData = async (patient: PatientRecord, step: TreatmentStep) => {
  // 1. 環境変数(Secrets)からキーを取得
  const apiKey = process.env.API_KEY;
  
  // 2. キーの取得状況をチェック
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    return "【エラー：キーが届いていません】\n" +
           "開発環境のSecrets設定が、まだプログラムに反映されていません。\n" +
           "・Name: API_KEY が正しいか再確認してください。\n" +
           "・設定後、一度ブラウザのタブを閉じて開き直すか、エディタをリスタートしてください。";
  }

  // 3. キーの形式チェック
  if (!apiKey.startsWith("AIza")) {
    return "【エラー：キーの形式が不正です】\n" +
           "取得したキーが 'AIza' で始まっていないようです。コピーミスがないか確認してください。";
  }

  try {
    // APIを呼び出す直前にインスタンスを作成（最新のキーを確実に使用するため）
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
      text: `あなたは歯科専門のAI臨床アドバイザーです。
以下の情報を歯科医学的な視点で分析し、日本語で具体的なアドバイスを行ってください。

【患者】${patient.name}
【工程】${step.label}
【メモ】${step.notes || "未入力"}
【特記】${patient.profileNotes || "特になし"}

分析：
1. 現状の整理
2. 臨床的リスク
3. 次回へのガイドライン
4. 患者説明用フレーズ`
    });

    // 最新モデルでリクエスト
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts }],
    });

    if (!response || !response.text) {
      throw new Error("AIの応答が空でした。");
    }

    return response.text;
    
  } catch (error: any) {
    console.error("DEBUG - API Error Details:", error);
    
    // Googleから返ってきた生のメッセージを解析
    const rawMessage = error.message || "";
    
    if (rawMessage.includes("API key not valid")) {
      return "【Googleの回答：APIキーが無効です】\n" +
             "入力されたAPIキーが間違っているか、Google側でまだ有効化されていません。AI Studioで新しいキーを作成してみてください。";
    }
    
    if (rawMessage.includes("403")) {
      return "【Googleの回答：アクセス拒否 (403)】\n" +
             "APIキーの権限が足りないか、お使いの地域ではこのモデル（Gemini 3）が制限されている可能性があります。";
    }

    if (rawMessage.includes("model")) {
      return "【Googleの回答：モデルエラー】\n" +
             "指定したモデル（gemini-3-flash-preview）が見つかりません。APIキーが最新モデルに対応しているか確認してください。";
    }

    return `【API通信エラー】\n理由: ${rawMessage}\n\n※このメッセージが表示される場合、通信は行われていますが、Google側で拒否されています。`;
  }
};
