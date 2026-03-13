import { z } from "zod";

// Sentiment schema
export const SentimentSchema = z.object({
    joy: z.number().min(0).max(1),
    anxiety: z.number().min(0).max(1),
    stress: z.number().min(0).max(1),
    energy: z.number().min(0).max(1).optional(),
});

export type Sentiment = z.infer<typeof SentimentSchema>;

// Dream analysis schema
export const DreamAnalysisSchema = z.object({
    title: z.string().min(1).max(50),
    sentiment: SentimentSchema,
    score: z.number().min(0).max(100),
    interpretation: z.string(),
});

export type DreamAnalysis = z.infer<typeof DreamAnalysisSchema>;

// Message schema
export const MessageSchema = z.object({
    role: z.enum(["user", "model"]),
    content: z.string(),
});

export type Message = z.infer<typeof MessageSchema>;

// History schema for digDeeper
export const HistorySchema = z.array(MessageSchema);

export type History = z.infer<typeof HistorySchema>;

// Dream content validation
export const DreamContentSchema = z.string().min(1, "夢の内容を入力してください").max(10000, "内容が長すぎます");

// Action result types
export type AnalyzeActionResult =
    | { success: true; analysis: DreamAnalysis }
    | { success: false; error: string };

export type DigDeeperActionResult =
    | { success: true; question: string }
    | { success: false; error: string };

export type RecordOnChainResult =
    | { success: true; hash: string; message?: string }
    | { success: false; error: string };

// DreamLog - decoded from blockchain message
export type DreamLog = {
    type: 'dream_log';
    content: string;
    analysis: DreamAnalysis;
    timestamp: number;
    signerPublicKey: string;
    txHash: string;
};

// StoryLog - generated story record (validated on server)
export const StoryLogSchema = z.object({
    type: z.literal('story_log'),
    title: z.string().min(1).max(200),
    content: z.string().min(1).max(10000),
    sources: z.array(z.object({
        txHash: z.string().regex(/^[0-9A-Fa-f]{64}$/),
        dreamerKey: z.string(),
    })).min(1).max(5),
    timestamp: z.number(),
});

export type StoryLog = z.infer<typeof StoryLogSchema>;

// Generated story from AI
export type GeneratedStory = {
    title: string;
    content: string;
};

// Saved story with provenance info
export type SavedStory = {
    type: 'story_log';
    title: string;
    content: string;
    sourceDreamHashes: string[];
    timestamp: number;
    txHash: string;
};

// Action result types for story features
export type FetchDreamsResult =
    | { success: true; dreams: DreamLog[] }
    | { success: false; error: string };

export type GenerateStoryResult =
    | { success: true; story: GeneratedStory }
    | { success: false; error: string };

export type FetchStoriesResult =
    | { success: true; stories: SavedStory[] }
    | { success: false; error: string };

export type RefineStoryResult =
    | { success: true; story: GeneratedStory }
    | { success: false; error: string };
