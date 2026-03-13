"use client";

import { useState, useEffect } from "react";
import { fetchStoriesAction } from "@/app/actions";
import { Loader2, BookOpen, ExternalLink, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SavedStory } from "@/types/dream";
import Link from "next/link";

const EXPLORER_URL = "https://testnet.symbol.fyi/transactions";

function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function StoriesPage() {
    const [stories, setStories] = useState<SavedStory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedStory, setExpandedStory] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStories();
    }, []);

    const loadStories = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await fetchStoriesAction();

            if (result.success) {
                setStories(result.stories);
            } else {
                setError(result.error);
            }
        } catch {
            setError("物語の読み込みに失敗しました");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleExpand = (txHash: string) => {
        setExpandedStory(prev => prev === txHash ? null : txHash);
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <header className="mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-primary" />
                    物語ライブラリ
                </h1>
                <p className="text-muted-foreground mt-2">
                    ブロックチェーンに保存された物語の一覧です。どの夢から生まれたかも確認できます。
                </p>
            </header>

            {error && (
                <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    物語を読み込み中...
                </div>
            ) : stories.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="mb-2">まだ物語が保存されていません。</p>
                    <Link href="/story" className="text-primary hover:underline">
                        夢から物語を紡ぐ
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {stories.map((story) => {
                        const isExpanded = expandedStory === story.txHash;
                        return (
                            <div
                                key={story.txHash}
                                className="rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md"
                            >
                                {/* Header */}
                                <button
                                    onClick={() => toggleExpand(story.txHash)}
                                    className="w-full p-5 text-left"
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0">
                                            <h2 className="font-semibold text-lg truncate">
                                                {story.title}
                                            </h2>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {formatDate(story.timestamp)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                                                {story.sourceDreamHashes.length}つの夢
                                            </span>
                                            <ChevronDown
                                                className={cn(
                                                    "w-4 h-4 text-muted-foreground transition-transform",
                                                    isExpanded && "rotate-180"
                                                )}
                                            />
                                        </div>
                                    </div>

                                    {/* Preview (collapsed) */}
                                    {!isExpanded && (
                                        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                                            {story.content}
                                        </p>
                                    )}
                                </button>

                                {/* Expanded content */}
                                {isExpanded && (
                                    <div className="px-5 pb-5 border-t border-border/50 pt-4 animate-in fade-in slide-in-from-top-2">
                                        {/* Story content */}
                                        <div className="prose prose-invert max-w-none mb-6">
                                            <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed text-sm">
                                                {story.content}
                                            </p>
                                        </div>

                                        {/* Provenance: source dreams */}
                                        <div className="p-4 bg-secondary/50 rounded-lg mb-4">
                                            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                                                来歴（元になった夢）
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {story.sourceDreamHashes.map((hash) => (
                                                    <a
                                                        key={hash}
                                                        href={`${EXPLORER_URL}/${hash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs font-mono bg-background px-2 py-1 rounded hover:text-primary flex items-center gap-1"
                                                    >
                                                        {hash.slice(0, 8)}...
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                ))}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                ブロックチェーン上のトランザクションで各夢の存在を検証できます
                                            </p>
                                        </div>

                                        {/* Story transaction */}
                                        {story.txHash && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">物語Tx:</span>
                                                <a
                                                    href={`${EXPLORER_URL}/${story.txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-mono text-muted-foreground hover:text-primary flex items-center gap-1"
                                                >
                                                    {story.txHash.slice(0, 16)}...
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
