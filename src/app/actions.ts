"use server";

import { SymbolFacade } from 'symbol-sdk/symbol';
import { PrivateKey } from 'symbol-sdk';
import { aiService } from "@/services/ai";
import { saveDream, saveStory, loadAllDreams, loadAllStories, hashContent } from "@/services/dreamStore";
import {
    DreamContentSchema,
    DreamAnalysisSchema,
    HistorySchema,
    StoryLogSchema,
    type DreamAnalysis,
    type AnalyzeActionResult,
    type DigDeeperActionResult,
    type RecordOnChainResult,
    type StoryLog,
    type GeneratedStory,
    type FetchDreamsResult,
    type FetchStoriesResult,
    type GenerateStoryResult,
    type RefineStoryResult,
} from "@/types/dream";

// Constants
const SYMBOL_TESTNET_EPOCH_ADJUSTMENT = 1667250467;
const TRANSACTION_DEADLINE_MS = 7200000; // 2 hours

// Environment helper
function getOptionalEnv(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
}

const NODE_URL = getOptionalEnv('SYMBOL_NODE_URL', 'https://sym-test-01.opening-line.jp:3001');

// Shared helper: create keypair and address from env
function createKeyPairFromEnv() {
    const privateKeyStr = process.env.SYMBOL_PRIVATE_KEY;
    if (!privateKeyStr) {
        throw new Error("SYMBOL_PRIVATE_KEY が設定されていません。.env.local を確認してください。");
    }

    const facade = new SymbolFacade('testnet');
    const privateKey = new PrivateKey(privateKeyStr);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const facadeStatic = (facade as any).static;
    const keyPair = new facadeStatic.KeyPair(privateKey);
    const signerPublicKey = keyPair.publicKey;
    const address = facade.network.publicKeyToAddress(signerPublicKey);

    return { facade, keyPair, signerPublicKey, address };
}

// Shared helper: sign and announce transaction
async function signAndAnnounce(
    facade: SymbolFacade,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keyPair: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transaction: any
): Promise<{ txHash: string }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const facadeAny = facade as any;
    const signature = facadeAny.signTransaction(keyPair, transaction);
    const jsonPayload = facade.transactionFactory.static.attachSignature(transaction, signature);
    const txHash = facadeAny.hashTransaction(transaction).toString();

    const response = await fetch(`${NODE_URL}/transactions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: jsonPayload,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Node error: ${response.status} - ${text}`);
    }

    await response.text(); // consume body
    return { txHash };
}

// Build a small on-chain message (hash-only proof)
function buildProofMessage(type: string, contentHash: string): Uint8Array {
    const payload = JSON.stringify({ type, hash: contentHash, ts: Date.now() });
    return encodeMessage(payload);
}

// Build story proof with source dream txHashes for provenance verification
function buildStoryProofMessage(contentHash: string, sourceTxHashes: string[]): Uint8Array {
    const payload = JSON.stringify({
        type: 'story_log',
        hash: contentHash,
        sources: sourceTxHashes,
        ts: Date.now(),
    });
    return encodeMessage(payload);
}

// Encode JSON payload as Symbol plain-text message (0x00 prefix)
function encodeMessage(payload: string): Uint8Array {
    const payloadBytes = new TextEncoder().encode(payload);
    const message = new Uint8Array(payloadBytes.length + 1);
    message[0] = 0x00;
    message.set(payloadBytes, 1);
    return message;
}

export async function recordDreamOnChain(
    dreamContent: string,
    analysisResult: DreamAnalysis
): Promise<RecordOnChainResult> {
    const contentValidation = DreamContentSchema.safeParse(dreamContent);
    if (!contentValidation.success) {
        return { success: false, error: "Invalid dream content: " + contentValidation.error.issues[0].message };
    }

    const analysisValidation = DreamAnalysisSchema.safeParse(analysisResult);
    if (!analysisValidation.success) {
        return { success: false, error: "Invalid analysis result format" };
    }

    try {
        const { facade, keyPair, signerPublicKey, address } = createKeyPairFromEnv();

        // Hash the full content for on-chain proof
        const contentHash = hashContent(contentValidation.data);
        const message = buildProofMessage('dream_log', contentHash);

        const deadline = BigInt(Date.now() + TRANSACTION_DEADLINE_MS - SYMBOL_TESTNET_EPOCH_ADJUSTMENT * 1000);

        const transaction = facade.transactionFactory.create({
            type: 'transfer_transaction_v1',
            signerPublicKey: signerPublicKey.toString(),
            recipientAddress: address.toString(),
            mosaics: [],
            message,
            deadline,
            fee: BigInt(1000000),
        });

        const { txHash } = await signAndAnnounce(facade, keyPair, transaction);

        // Save full content locally with signer's public key for provenance
        await saveDream(contentValidation.data, analysisValidation.data, txHash, signerPublicKey.toString());

        return { success: true, hash: txHash };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return { success: false, error: `ブロックチェーン記録エラー: ${errorMessage}` };
    }
}

export async function analyzeDreamAction(dreamContent: string): Promise<AnalyzeActionResult> {
    const validation = DreamContentSchema.safeParse(dreamContent);
    if (!validation.success) {
        return { success: false, error: validation.error.issues[0].message };
    }

    try {
        const analysis = await aiService.analyzeDream(validation.data);
        return { success: true, analysis };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Analysis failed";
        return { success: false, error: errorMessage };
    }
}

export async function digDeeperAction(
    history: { role: "user" | "model"; content: string }[]
): Promise<DigDeeperActionResult> {
    const validation = HistorySchema.safeParse(history);
    if (!validation.success) {
        return { success: false, error: "Invalid conversation history format" };
    }

    try {
        const question = await aiService.digDeeper(validation.data);
        return { success: true, question };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to generate question";
        return { success: false, error: errorMessage };
    }
}

// Fetch dreams from local storage
export async function fetchDreamsFromChain(): Promise<FetchDreamsResult> {
    try {
        const dreams = await loadAllDreams();
        return {
            success: true,
            dreams: dreams.map(d => ({
                type: 'dream_log' as const,
                content: d.content,
                analysis: d.analysis,
                timestamp: d.timestamp,
                signerPublicKey: d.signerPublicKey ?? '',
                txHash: d.txHash ?? '',
            })),
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch dreams";
        return { success: false, error: errorMessage };
    }
}

// Helper function to convert hex string to bytes (kept for potential future use)
function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
}

// Generate story from selected dreams
export async function generateStoryAction(dreamContents: string[]): Promise<GenerateStoryResult> {
    if (dreamContents.length < 2) {
        return { success: false, error: "2つ以上の夢を選択してください" };
    }

    if (dreamContents.length > 5) {
        return { success: false, error: "5つ以下の夢を選択してください" };
    }

    try {
        const story = await aiService.generateStory(dreamContents);
        return { success: true, story };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to generate story";
        return { success: false, error: errorMessage };
    }
}

// Record story on blockchain with provenance proof (includes source dream txHashes)
export async function recordStoryOnChain(storyLog: StoryLog): Promise<RecordOnChainResult> {
    const validation = StoryLogSchema.safeParse(storyLog);
    if (!validation.success) {
        return { success: false, error: "Invalid story data: " + validation.error.issues[0].message };
    }

    try {
        const { facade, keyPair, signerPublicKey, address } = createKeyPairFromEnv();

        const contentHash = hashContent(storyLog.content);
        const sourceTxHashes = storyLog.sources.map(s => s.txHash);
        const message = buildStoryProofMessage(contentHash, sourceTxHashes);

        const deadline = BigInt(Date.now() + TRANSACTION_DEADLINE_MS - SYMBOL_TESTNET_EPOCH_ADJUSTMENT * 1000);

        const transaction = facade.transactionFactory.create({
            type: 'transfer_transaction_v1',
            signerPublicKey: signerPublicKey.toString(),
            recipientAddress: address.toString(),
            mosaics: [],
            message,
            deadline,
            fee: BigInt(1000000),
        });

        const { txHash } = await signAndAnnounce(facade, keyPair, transaction);

        // Save full story locally
        await saveStory(storyLog.title, storyLog.content, sourceTxHashes, txHash);

        return { success: true, hash: txHash };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return { success: false, error: `ブロックチェーン記録エラー: ${errorMessage}` };
    }
}

// Fetch saved stories from local storage
export async function fetchStoriesAction(): Promise<FetchStoriesResult> {
    try {
        const stories = await loadAllStories();
        return {
            success: true,
            stories: stories.map(s => ({
                type: 'story_log' as const,
                title: s.title,
                content: s.content,
                sourceDreamHashes: s.sourceDreamHashes,
                timestamp: s.timestamp,
                txHash: s.txHash ?? '',
            })),
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch stories";
        return { success: false, error: errorMessage };
    }
}

// Refine story based on user feedback
export async function refineStoryAction(
    currentStory: GeneratedStory,
    originalDreams: string[],
    feedback: string
): Promise<RefineStoryResult> {
    if (!feedback.trim()) {
        return { success: false, error: "フィードバックを入力してください" };
    }

    if (feedback.length > 1000) {
        return { success: false, error: "フィードバックが長すぎます（1000文字以内）" };
    }

    if (!currentStory.title || !currentStory.content) {
        return { success: false, error: "物語データが不正です" };
    }

    try {
        const story = await aiService.refineStory(currentStory, originalDreams, feedback);
        return { success: true, story };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to refine story";
        return { success: false, error: errorMessage };
    }
}

// Suppress unused import warning
void hexToBytes;
