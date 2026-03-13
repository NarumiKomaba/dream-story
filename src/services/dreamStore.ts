import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { DreamAnalysis } from "@/types/dream";

// Use /tmp on Vercel (serverless), local .data otherwise
const BASE_DATA_DIR = process.env.VERCEL
    ? path.join("/tmp", ".data")
    : path.join(process.cwd(), ".data");
const DREAMS_DIR = path.join(BASE_DATA_DIR, "dreams");
const STORIES_DIR = path.join(BASE_DATA_DIR, "stories");

export type StoredDream = {
    contentHash: string;
    content: string;
    analysis: DreamAnalysis;
    timestamp: number;
    txHash?: string;
    signerPublicKey?: string;
};

export type StoredStory = {
    contentHash: string;
    title: string;
    content: string;
    sourceDreamHashes: string[];
    timestamp: number;
    txHash?: string;
};

function hashContent(content: string): string {
    return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

async function ensureDir(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
}

// --- Dream operations ---

export async function saveDream(
    content: string,
    analysis: DreamAnalysis,
    txHash: string,
    signerPublicKey: string
): Promise<StoredDream> {
    await ensureDir(DREAMS_DIR);

    const contentHash = hashContent(content);
    const dream: StoredDream = {
        contentHash,
        content,
        analysis,
        timestamp: Date.now(),
        txHash,
        signerPublicKey,
    };

    const filePath = path.join(DREAMS_DIR, `${contentHash}.json`);
    await fs.writeFile(filePath, JSON.stringify(dream, null, 2), "utf8");
    return dream;
}

export async function loadAllDreams(): Promise<StoredDream[]> {
    await ensureDir(DREAMS_DIR);

    const files = await fs.readdir(DREAMS_DIR);
    const dreams: StoredDream[] = [];

    for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
            const raw = await fs.readFile(path.join(DREAMS_DIR, file), "utf8");
            const dream: StoredDream = JSON.parse(raw);
            if (dream.contentHash && dream.content) {
                dreams.push(dream);
            }
        } catch {
            // Skip corrupted files
        }
    }

    return dreams.sort((a, b) => b.timestamp - a.timestamp);
}

// --- Story operations ---

export async function saveStory(
    title: string,
    content: string,
    sourceDreamHashes: string[],
    txHash: string
): Promise<StoredStory> {
    await ensureDir(STORIES_DIR);

    const contentHash = hashContent(content);
    const story: StoredStory = {
        contentHash,
        title,
        content,
        sourceDreamHashes,
        timestamp: Date.now(),
        txHash,
    };

    const filePath = path.join(STORIES_DIR, `${contentHash}.json`);
    await fs.writeFile(filePath, JSON.stringify(story, null, 2), "utf8");
    return story;
}

export async function loadAllStories(): Promise<StoredStory[]> {
    await ensureDir(STORIES_DIR);

    const files = await fs.readdir(STORIES_DIR);
    const stories: StoredStory[] = [];

    for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
            const raw = await fs.readFile(path.join(STORIES_DIR, file), "utf8");
            const story: StoredStory = JSON.parse(raw);
            if (story.contentHash && story.content) {
                stories.push(story);
            }
        } catch {
            // Skip corrupted files
        }
    }

    return stories.sort((a, b) => b.timestamp - a.timestamp);
}

export { hashContent };
