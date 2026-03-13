"use client";

import { useState, useEffect, useRef } from "react";
import { generateStoryAction, recordStoryOnChain, refineStoryAction } from "@/app/actions";
import { loadDreamsFromLocal } from "@/services/clientDreamStore";
import { Loader2, Sparkles, BookOpen, Check, ExternalLink, ChevronDown, Send, MessageCircle, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DreamLog, GeneratedStory, StoryLog } from "@/types/dream";
import Link from "next/link";

const EXPLORER_URL = "https://testnet.symbol.fyi/transactions";

type FeedbackMessage = {
    role: 'user' | 'model';
    content: string;
};

export default function StoryPage() {
    const [dreams, setDreams] = useState<DreamLog[]>([]);
    const [selectedDreams, setSelectedDreams] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [story, setStory] = useState<GeneratedStory | null>(null);
    const [txHash, setTxHash] = useState("");
    const [expandedDream, setExpandedDream] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Feedback chat state
    const [feedbackHistory, setFeedbackHistory] = useState<FeedbackMessage[]>([]);
    const [feedbackInput, setFeedbackInput] = useState("");
    const [isRefining, setIsRefining] = useState(false);
    const feedbackEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        loadDreams();
    }, []);

    useEffect(() => {
        feedbackEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [feedbackHistory]);

    useEffect(() => {
        if (feedbackInput === "" && textareaRef.current) {
            textareaRef.current.style.height = "44px";
        }
    }, [feedbackInput]);

    const loadDreams = () => {
        setIsLoading(true);
        setError(null);

        try {
            const dreams = loadDreamsFromLocal();
            setDreams(dreams);
        } catch {
            setError("夢の読み込みに失敗しました");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleDreamSelection = (hash: string) => {
        setSelectedDreams(prev => {
            const newSet = new Set(prev);
            if (newSet.has(hash)) {
                newSet.delete(hash);
            } else if (newSet.size < 5) {
                newSet.add(hash);
            }
            return newSet;
        });
    };

    const getSelectedDreamContents = (): string[] => {
        return dreams
            .filter(d => selectedDreams.has(d.txHash))
            .map(d => d.content);
    };

    const handleGenerateStory = async () => {
        if (selectedDreams.size < 2) {
            setError("2つ以上の夢を選択してください");
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const result = await generateStoryAction(getSelectedDreamContents());
            if (result.success) {
                setStory(result.story);
                setFeedbackHistory([]);
            } else {
                setError(result.error);
            }
        } catch {
            setError("物語の生成に失敗しました");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendFeedback = async () => {
        if (!feedbackInput.trim() || !story || isRefining) return;

        const userMessage = feedbackInput.trim();
        setFeedbackInput("");
        setIsRefining(true);
        setError(null);

        const updatedHistory: FeedbackMessage[] = [
            ...feedbackHistory,
            { role: 'user', content: userMessage },
        ];
        setFeedbackHistory(updatedHistory);

        try {
            const result = await refineStoryAction(
                story,
                getSelectedDreamContents(),
                userMessage
            );

            if (result.success) {
                setStory(result.story);
                setFeedbackHistory(prev => [
                    ...prev,
                    { role: 'model', content: `物語を改変しました: 「${result.story.title}」` },
                ]);
            } else {
                setError(result.error);
                setFeedbackHistory(prev => [
                    ...prev,
                    { role: 'model', content: "改変に失敗しました。もう一度お試しください。" },
                ]);
            }
        } catch {
            setError("フィードバックの処理に失敗しました");
        } finally {
            setIsRefining(false);
        }
    };

    const handleRecordStory = async () => {
        if (!story) return;

        setIsGenerating(true);
        setError(null);

        try {
            const storyLog: StoryLog = {
                type: 'story_log',
                title: story.title,
                content: story.content,
                sources: dreams
                    .filter(d => selectedDreams.has(d.txHash))
                    .map(d => ({ txHash: d.txHash, dreamerKey: d.signerPublicKey })),
                timestamp: Date.now()
            };

            const result = await recordStoryOnChain(storyLog);

            if (result.success) {
                setTxHash(result.hash);
            } else {
                setError(result.error);
            }
        } catch {
            setError("ブロックチェーンへの記録に失敗しました");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleReset = () => {
        setStory(null);
        setTxHash("");
        setSelectedDreams(new Set());
        setFeedbackHistory([]);
        setFeedbackInput("");
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('ja-JP', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <header className="mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-primary" />
                    夢を紡いで物語に
                </h1>
                <p className="text-muted-foreground mt-2">
                    複数の夢を選んでAIが一つの物語を創作します。フィードバックで物語を磨き、ブロックチェーンに永久保存できます。
                </p>
            </header>

            {error && (
                <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                    {error}
                </div>
            )}

            {/* Dream Selection */}
            {!story && (
                <section className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">記録された夢</h2>
                        <span className="text-sm text-muted-foreground">
                            {selectedDreams.size}/5 選択中
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            夢を読み込み中...
                        </div>
                    ) : dreams.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>まだ夢が記録されていません。</p>
                            <Link href="/" className="text-primary hover:underline mt-2 inline-block">
                                夢を記録する
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {dreams.map((dream) => {
                                const isExpanded = expandedDream === dream.txHash;
                                const isSelected = selectedDreams.has(dream.txHash);
                                return (
                                    <div
                                        key={dream.txHash}
                                        className={cn(
                                            "rounded-lg border transition-all",
                                            isSelected
                                                ? "border-primary bg-primary/10"
                                                : "border-border bg-card hover:border-primary/50"
                                        )}
                                    >
                                        <button
                                            onClick={() => toggleDreamSelection(dream.txHash)}
                                            className="w-full p-4 text-left"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                                                    <span className="font-medium text-sm truncate">
                                                        {dream.analysis.title ?? dream.content.slice(0, 20) + "..."}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                                    <span className={cn(
                                                        "text-xs px-2 py-0.5 rounded",
                                                        dream.analysis.score >= 70 ? "bg-green-500/20 text-green-400" :
                                                        dream.analysis.score >= 40 ? "bg-yellow-500/20 text-yellow-400" :
                                                        "bg-red-500/20 text-red-400"
                                                    )}>
                                                        {dream.analysis.score}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatDate(dream.timestamp)}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                        <div className="px-4 pb-2 flex items-center gap-2">
                                            <button
                                                onClick={() => setExpandedDream(isExpanded ? null : dream.txHash)}
                                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                                            >
                                                <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
                                                {isExpanded ? "閉じる" : "詳細"}
                                            </button>
                                            {dream.txHash && (
                                                <a
                                                    href={`${EXPLORER_URL}/${dream.txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                    Chain
                                                </a>
                                            )}
                                        </div>
                                        {isExpanded && (
                                            <div className="px-4 pb-4 border-t border-border/50 pt-3">
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{dream.content}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {dreams.length > 0 && (
                        <button
                            onClick={handleGenerateStory}
                            disabled={selectedDreams.size < 2 || isGenerating}
                            className="mt-6 w-full flex items-center justify-center px-6 py-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    物語を生成中...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    選択した夢で物語を紡ぐ
                                </>
                            )}
                        </button>
                    )}
                </section>
            )}

            {/* Generated Story */}
            {story && (
                <section className="animate-in fade-in slide-in-from-bottom-4">
                    <div className="p-6 rounded-xl border bg-card shadow-lg">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-500" />
                            {story.title}
                        </h2>
                        <div className="prose prose-invert max-w-none mb-6">
                            <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
                                {story.content}
                            </p>
                        </div>

                        <div className="mb-6 p-4 bg-secondary/50 rounded-lg">
                            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">来歴（元になった夢）</h3>
                            <div className="flex flex-wrap gap-2">
                                {Array.from(selectedDreams).map((hash) => (
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
                        </div>

                        {/* Feedback Chat Section */}
                        {!txHash && (
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                                    <h3 className="text-sm font-semibold text-muted-foreground">
                                        フィードバックで物語を磨く
                                    </h3>
                                </div>

                                {/* Chat history */}
                                {feedbackHistory.length > 0 && (
                                    <div className="mb-3 p-3 bg-secondary/30 rounded-lg space-y-2 max-h-60 overflow-y-auto">
                                        {feedbackHistory.map((msg, idx) => (
                                            <div
                                                key={idx}
                                                className={cn(
                                                    "flex items-start gap-2",
                                                    msg.role === "user" ? "flex-row-reverse" : ""
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                                                    msg.role === "user"
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-card border"
                                                )}>
                                                    {msg.role === "user"
                                                        ? <User className="w-3 h-3" />
                                                        : <Bot className="w-3 h-3 text-primary" />
                                                    }
                                                </div>
                                                <div className={cn(
                                                    "px-3 py-1.5 rounded-lg text-xs max-w-[80%]",
                                                    msg.role === "user"
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-card border"
                                                )}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))}
                                        {isRefining && (
                                            <div className="flex items-center gap-2 text-muted-foreground text-xs ml-8">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                物語を改変中...
                                            </div>
                                        )}
                                        <div ref={feedbackEndRef} />
                                    </div>
                                )}

                                {/* Feedback input */}
                                <div className="flex gap-2 items-end">
                                    <textarea
                                        ref={textareaRef}
                                        value={feedbackInput}
                                        onChange={(e) => {
                                            setFeedbackInput(e.target.value);
                                            e.target.style.height = "auto";
                                            e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendFeedback();
                                            }
                                        }}
                                        placeholder="もっと怖くして、この要素を膨らませて..."
                                        className="flex-1 p-2.5 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary outline-none resize-none overflow-hidden"
                                        style={{ height: "44px" }}
                                        disabled={isRefining}
                                        rows={1}
                                    />
                                    <button
                                        onClick={handleSendFeedback}
                                        disabled={!feedbackInput.trim() || isRefining}
                                        className="px-3 h-[44px] rounded-lg bg-secondary hover:bg-secondary/80 text-foreground disabled:opacity-50 transition-all"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        {!txHash ? (
                            <div className="flex gap-3">
                                <button
                                    onClick={handleReset}
                                    className="flex-1 px-4 py-2 rounded-md border border-border hover:bg-secondary transition-all"
                                >
                                    やり直す
                                </button>
                                <button
                                    onClick={handleRecordStory}
                                    disabled={isGenerating || isRefining}
                                    className="flex-1 flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
                                >
                                    {isGenerating ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        "ブロックチェーンに永久保存"
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
                                <div className="font-bold mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    物語を永久保存しました!
                                </div>
                                <a
                                    href={`${EXPLORER_URL}/${txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-mono break-all hover:underline flex items-center gap-1"
                                >
                                    {txHash}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                                <button
                                    onClick={handleReset}
                                    className="mt-4 text-sm underline hover:text-green-300"
                                >
                                    新しい物語を作る
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}
