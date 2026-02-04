import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

export class AiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        if (!API_KEY) {
            console.warn("GEMINI_API_KEY is not set. AI features will fail or mock.");
        }
        this.genAI = new GoogleGenerativeAI(API_KEY || "");
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    async analyzeDream(dreamText: string) {
        if (!API_KEY) {
            // Fallback mock if no key provided
            return {
                sentiment: { joy: 0.1, anxiety: 0.1, stress: 0.1 },
                score: 0,
                interpretation: "AI Key missing. Please configure GEMINI_API_KEY."
            };
        }

        const prompt = `
      以下の夢の内容を、心理学的および健康的な観点から分析してください。
      マークダウンを含まない、有効なJSON形式のみを出力してください。
      
      json format:
      {
        "sentiment": {
          "joy": number (0.0-1.0),
          "anxiety": number (0.0-1.0),
          "stress": number (0.0-1.0),
          "energy": number (0.0-1.0)
        },
        "score": number (0-100, 健康スコア),
        "interpretation": "潜在的なストレスや健康状態に関する具体的で短いフィードバック（最大200文字、日本語）。"
      }
      
      Dream: "${dreamText}"
    `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();

            // Clean up markdown code blocks if present
            text = text.replace(/```json/g, "").replace(/```/g, "").trim();

            return JSON.parse(text);
        } catch (error) {
            console.warn("AI Analysis Failed (using mock response):", error);
            // Fallback mock to ensure app flow works
            return {
                sentiment: {
                    joy: 0.8,
                    anxiety: 0.1,
                    stress: 0.1,
                    energy: 0.9
                },
                score: 92,
                interpretation: "AIサービスが応答しませんでした。デモ分析結果：あなたの夢は非常にポジティブで創造的なエネルギーに満ちています。"
            };
        }
    }

    // Generate a follow-up question to dig deeper into the dream
    async digDeeper(history: { role: "user" | "model", content: string }[]) {
        if (!API_KEY) {
            return "（デモ）それは具体的にどのような色や雰囲気でしたか？";
        }

        const context = history.map(h => `${h.role}: ${h.content}`).join("\n");
        const prompt = `
      あなたは心理カウンセラーであり、夢占い師です。
      ユーザーの夢の話を聞き、より深い心理状態や詳細を引き出すための「短い質問」を1つだけしてください。
      
      これまでの会話:
      ${context}
      
      条件:
      1. 日本語で答えてください。
      2. 質問は1つだけにしてください。
      3. 丁寧ですが、親しみやすい口調で。
      4. ユーザーが既に話したことを繰り返さないでください。
    `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            return "（デモ）その時、他には誰かいましたか？";
        }
    }
}

export const aiService = new AiService();
