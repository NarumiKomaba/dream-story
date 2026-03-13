"use client";

import { useState, useRef, useEffect } from "react";
import { recordDreamOnChain, analyzeDreamAction, digDeeperAction } from "@/app/actions";
import { Loader2, Send, Sparkles, User, Bot, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message, DreamAnalysis } from "@/types/dream";

const EXPLORER_URL = "https://testnet.symbol.fyi/transactions";

const INITIAL_MESSAGE: Message = {
    role: "model",
    content: "こんにちは。昨晩はどんな夢を見ましたか？覚えている範囲で教えてください。"
};

const ERROR_MESSAGES = {
    SEND_FAILED: "すみません、少し考え事をしていました。もう一度教えていただけますか？",
    ANALYZE_FAILED: "分析に失敗しました",
    RECORD_FAILED: "記録に失敗しました",
    UNEXPECTED_ERROR: "予期せぬエラーが発生しました",
} as const;

export default function Home() {
    const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [analysis, setAnalysis] = useState<DreamAnalysis | null>(null);
    const [txHash, setTxHash] = useState("");
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Reset textarea height when input is cleared
    useEffect(() => {
        if (input === "" && textareaRef.current) {
            textareaRef.current.style.height = "48px";
        }
    }, [input]);

    const clearError = () => setError(null);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        clearError();
        const userMsg: Message = { role: "user", content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const history = [...messages, userMsg];
            const result = await digDeeperAction(history);

            if (result.success && result.question) {
                setMessages(prev => [...prev, { role: "model", content: result.question }]);
            } else {
                // Show actual error for debugging
                const errorDetail = !result.success ? result.error : "No response";
                setError(`AI Error: ${errorDetail}`);
                setMessages(prev => [...prev, { role: "model", content: ERROR_MESSAGES.SEND_FAILED }]);
            }
        } catch {
            setMessages(prev => [...prev, { role: "model", content: ERROR_MESSAGES.SEND_FAILED }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnalyze = async () => {
        clearError();
        setIsLoading(true);

        try {
            const dreamText = messages
                .filter(m => m.role === "user")
                .map(m => m.content)
                .join("\n");

            const result = await analyzeDreamAction(dreamText);

            if (result.success) {
                setAnalysis(result.analysis);
            } else {
                setError(`${ERROR_MESSAGES.ANALYZE_FAILED}: ${result.error}`);
            }
        } catch {
            setError(ERROR_MESSAGES.UNEXPECTED_ERROR);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRecord = async () => {
        if (!analysis) return;

        clearError();
        setIsLoading(true);

        try {
            const dreamText = messages
                .filter(m => m.role === "user")
                .map(m => m.content)
                .join("\n");

            const result = await recordDreamOnChain(dreamText, analysis);

            if (result.success) {
                setTxHash(result.hash);
            } else {
                setError(`${ERROR_MESSAGES.RECORD_FAILED}: ${result.error}`);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setError(`${ERROR_MESSAGES.UNEXPECTED_ERROR}: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        window.location.reload();
    };

    return (
        <div className="max-w-3xl mx-auto px-4 pb-40">
            <header className="sticky top-14 z-10 py-4 bg-background flex justify-between items-center">
                <h1 className="text-2xl font-bold">夢語りチャット</h1>
                {analysis && !txHash && (
                    <button
                        onClick={() => setAnalysis(null)}
                        className="text-sm text-muted-foreground hover:underline"
                    >
                        分析を閉じて会話に戻る
                    </button>
                )}
            </header>

            {error && (
                <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700">
                    {error}
                    <button
                        onClick={clearError}
                        className="ml-2 text-sm underline hover:no-underline"
                    >
                        閉じる
                    </button>
                </div>
            )}

            {/* Chat Area */}
            <div className="p-4 bg-secondary/20 rounded-xl space-y-4">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "flex items-start gap-3",
                            msg.role === "user" ? "flex-row-reverse" : ""
                        )}
                    >
                        <div
                            className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                msg.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-card border"
                            )}
                        >
                            {msg.role === "user" ? (
                                <User className="w-5 h-5" />
                            ) : (
                                <Bot className="w-5 h-5 text-primary" />
                            )}
                        </div>
                        <div
                            className={cn(
                                "p-3 rounded-lg max-w-[80%] text-sm leading-relaxed",
                                msg.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-card border shadow-sm"
                            )}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm ml-12">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        AIが思考中...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Analysis Result Overlay */}
            {analysis && (
                <div className="mb-6 p-6 rounded-xl border bg-card animate-in fade-in slide-in-from-bottom-4 shadow-lg">
                    <h3 className="text-xl font-semibold mb-1 flex items-center gap-2">
                        <Sparkles className="text-yellow-500 w-5 h-5" /> {analysis.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">分析レポート</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                        <div className="text-center p-3 bg-red-500/10 rounded-lg">
                            <div className="text-xs text-muted-foreground">ストレス</div>
                            <div className="text-xl font-bold text-red-500">
                                {Math.round(analysis.sentiment.stress * 100)}%
                            </div>
                        </div>
                        <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                            <div className="text-xs text-muted-foreground">不安</div>
                            <div className="text-xl font-bold text-blue-500">
                                {Math.round(analysis.sentiment.anxiety * 100)}%
                            </div>
                        </div>
                        <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
                            <div className="text-xs text-muted-foreground">喜び</div>
                            <div className="text-xl font-bold text-yellow-500">
                                {Math.round(analysis.sentiment.joy * 100)}%
                            </div>
                        </div>
                        <div className="text-center p-3 bg-green-500/10 rounded-lg">
                            <div className="text-xs text-muted-foreground">健康スコア</div>
                            <div className="text-xl font-bold text-green-500">
                                {analysis.score}
                            </div>
                        </div>
                    </div>
                    <p className="text-muted-foreground mb-6 bg-secondary/50 p-4 rounded-lg">
                        {analysis.interpretation}
                    </p>

                    {!txHash ? (
                        <button
                            onClick={handleRecord}
                            className="w-full flex items-center justify-center px-6 py-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all"
                        >
                            <Send className="mr-2 w-4 h-4" />
                            ブロックチェーンに永久保存する
                        </button>
                    ) : (
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 flex flex-col items-center text-center">
                            <div className="font-bold mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                記録完了!
                            </div>
                            <a
                                href={`${EXPLORER_URL}/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-mono break-all opacity-80 mb-4 hover:opacity-100 hover:underline flex items-center gap-1"
                            >
                                {txHash}
                                <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                            <button
                                onClick={handleReset}
                                className="text-sm underline hover:text-green-800"
                            >
                                新しい夢を記録する
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Input Area - Fixed at bottom */}
            {!analysis && (
                <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
                    <div className="max-w-3xl mx-auto flex flex-col gap-3">
                        {messages.length > 2 && (
                            <button
                                onClick={handleAnalyze}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400 hover:from-yellow-500/30 hover:to-orange-500/30 transition-all"
                            >
                                <Sparkles className="w-4 h-4" />
                                ここまでの内容で分析する
                            </button>
                        )}
                        <div className="flex gap-2 items-end">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => {
                                    setInput(e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="メッセージを入力...（Shift+Enterで改行）"
                                className="flex-1 p-3 rounded-lg border bg-card focus:ring-2 focus:ring-primary outline-none shadow-sm resize-none overflow-hidden"
                                style={{ height: "48px" }}
                                disabled={isLoading}
                                rows={1}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className="px-4 h-12 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
