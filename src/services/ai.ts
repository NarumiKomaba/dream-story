import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { DreamAnalysisSchema, type DreamAnalysis, type History, type GeneratedStory } from "@/types/dream";

// Mock responses for when API key is not configured
const MOCK_ANALYSIS: DreamAnalysis = {
    title: "不思議な夢",
    sentiment: { joy: 0.5, anxiety: 0.3, stress: 0.2, energy: 0.6 },
    score: 70,
    interpretation: "APIキーが設定されていません。GEMINI_API_KEYを設定してください。"
};

const MOCK_QUESTION = "（デモ）その夢の中で、どのような感情を感じていましたか？";

export class AiService {
    private genAI: GoogleGenerativeAI | null = null;
    private model: GenerativeModel | null = null;
    private initialized = false;

    private initialize() {
        if (this.initialized) return;
        this.initialized = true;

        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        }
    }

    async analyzeDream(dreamText: string): Promise<DreamAnalysis> {
        this.initialize();

        if (!this.model) {
            return MOCK_ANALYSIS;
        }

        const prompt = `
以下の夢の内容を、心理学的および健康的な観点から分析してください。
マークダウンを含まない、有効なJSON形式のみを出力してください。

json format:
{
  "title": "夢を象徴する短いタイトル（10文字以内、日本語）",
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

        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse JSON response with robust cleanup
        const parsed = this.parseJsonResponse(text);

        // Validate response structure
        const validation = DreamAnalysisSchema.safeParse(parsed);
        if (!validation.success) {
            throw new Error("AI returned invalid analysis format");
        }

        return validation.data;
    }

    async digDeeper(history: History): Promise<string> {
        this.initialize();

        if (!this.model) {
            return MOCK_QUESTION;
        }

        const context = history.map(h => `${h.role}: ${h.content}`).join("\n");
        const userMessageCount = history.filter(h => h.role === "user").length;

        const prompt = `
あなたは夢の話を聞くのが好きな友達です。

これまでの会話:
${context}

重要なルール:
- 話の内容に合わせた感想を言う
- 同じリアクション（「ええーっ」「えー」など）を連続で使わない
- バリエーション豊かに反応する

リアクションのバリエーション:
- 驚き系: 「えっ」「おお」「わ」「へぇ」「まじで」
- 共感系: 「うんうん」「そっか」「なるほどね」「だよね」
- 感想系: 「いいなぁ」「怖いね」「切ないね」「楽しそう」「素敵だね」

直前の自分の返答を見て、同じ出だしにならないようにする。

避けること:
- 「ええーっ」「えー」を何度も連続で使う
- 詳細を聞く質問

1文で。自然に。
`;

        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }

    async generateStory(dreams: string[]): Promise<GeneratedStory> {
        this.initialize();

        if (!this.model) {
            return {
                title: "夢の断片",
                content: "（デモ）複数の夢が織り成す不思議な物語..."
            };
        }

        const dreamsText = dreams.map((d, i) => `【夢${i + 1}】\n${d}`).join("\n\n");
        const prompt = `
あなたは夢を素材にした実験的な物語を書く作家です。
以下の複数の夢から、読み手が「え？」と立ち止まるような短編を創作してください。

${dreamsText}

創作ルール:
1. 夢の要素を「調和」させるな。「衝突」させろ。
   - 夢Aの場面に夢Bの登場人物が脈絡なく現れる、など
   - 矛盾する感情やイメージが同居して構わない
2. 予想外の因果を1つ以上作れ。
   - 本来無関係な2つの夢の要素が、奇妙な必然性で繋がる瞬間
3. 整理しすぎるな。夢の断片感・非論理性を残せ。
   - 読者が全てを理解できなくていい
   - 「なぜかわからないが、そうだった」という感覚を大事にする
4. 文体は「綺麗」ではなく「生々しい」。
   - 体温、匂い、手触り、違和感を書け
   - ポエムのような装飾語を避け、具体的なディテールで描写する
5. タイトルも型破りに。「〇〇の物語」のような無難なものは避ける。
6. 日本語で400〜600文字程度。

以下のJSON形式で出力してください（マークダウンなし）:
{
  "title": "物語のタイトル",
  "content": "物語の本文"
}
`;

        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const parsed = this.parseJsonResponse(text) as GeneratedStory;

        if (!parsed.title || !parsed.content) {
            throw new Error("AI returned invalid story format");
        }

        return parsed;
    }

    async refineStory(
        currentStory: GeneratedStory,
        originalDreams: string[],
        feedback: string
    ): Promise<GeneratedStory> {
        this.initialize();

        if (!this.model) {
            return {
                title: currentStory.title,
                content: currentStory.content + "（デモ: フィードバック反映）"
            };
        }

        const dreamsText = originalDreams.map((d, i) => `【夢${i + 1}】\n${d}`).join("\n\n");
        const prompt = `
あなたは夢を素材にした実験的な物語を書く作家です。
以下の物語を、ユーザーのフィードバックを元に改変してください。

【現在の物語】
タイトル: ${currentStory.title}
本文:
${currentStory.content}

【元になった夢】
${dreamsText}

【ユーザーのフィードバック】
${feedback}

改変ルール:
1. フィードバックの意図を汲み取り、物語の方向性を変える
2. 元の夢の要素は捨てずに活かす
3. フィードバックに応じて大胆に変えてよい（タイトルも含む）
4. 夢の要素を「衝突」させる姿勢は維持する
5. 整理しすぎず、断片感・非論理性を残す
6. 400〜600文字程度

以下のJSON形式で出力してください（マークダウンなし）:
{
  "title": "物語のタイトル",
  "content": "物語の本文"
}
`;

        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const parsed = this.parseJsonResponse(text) as GeneratedStory;

        if (!parsed.title || !parsed.content) {
            throw new Error("AI returned invalid refined story format");
        }

        return parsed;
    }

    private parseJsonResponse(text: string): unknown {
        // Remove markdown code blocks if present
        let cleaned = text
            .replace(/```json\s*/gi, "")
            .replace(/```\s*/g, "")
            .trim();

        // Try to extract JSON object if surrounded by other text
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        }

        try {
            return JSON.parse(cleaned);
        } catch {
            throw new Error("Failed to parse AI response as JSON");
        }
    }
}

export const aiService = new AiService();
