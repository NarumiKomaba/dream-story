import type { DreamLog, DreamAnalysis } from "@/types/dream";

const DREAMS_KEY = "dream-story:dreams";

export function saveDreamToLocal(
    content: string,
    analysis: DreamAnalysis,
    txHash: string,
    signerPublicKey: string
): DreamLog {
    const dream: DreamLog = {
        type: "dream_log",
        content,
        analysis,
        timestamp: Date.now(),
        signerPublicKey,
        txHash,
    };

    const existing = loadDreamsFromLocal();
    const updated = [dream, ...existing];
    localStorage.setItem(DREAMS_KEY, JSON.stringify(updated));
    return dream;
}

export function loadDreamsFromLocal(): DreamLog[] {
    try {
        const raw = localStorage.getItem(DREAMS_KEY);
        if (!raw) return [];
        const parsed: DreamLog[] = JSON.parse(raw);
        return parsed.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
        return [];
    }
}
