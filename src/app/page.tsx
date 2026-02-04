"use client";

import { useState, useRef, useEffect } from "react";
import { recordDreamOnChain, analyzeDreamAction, digDeeperAction } from "@/app/actions";
import { Loader2, Send, Sparkles, User, Bot, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Message = {
    role: "user" | "model";
    content: string;
};

export default function Home() {
    const [messages, setMessages] = useState<Message[]>([
        { role: "model", content: "こんにちは。昨晩はどんな夢を見ましたか？覚えている範囲で教えてください。" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [txHash, setTxHash] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: "user", content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            // Create a temporary history for the AI context
            const history = [...messages, userMsg];

            // Call Digging Action
            const result = await digDeeperAction(history);

            if (result.success && result.question) {
                setMessages(prev => [...prev, { role: "model", content: result.question }]);
            } else {
                setMessages(prev => [...prev, { role: "model", content: "すみません、少し考え事をしいました。もう一度教えていただけますか？" }]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnalyze = async () => {
        setIsLoading(true);
        try {
            // Combine all user messages for analysis
            const dreamText = messages
                .filter(m => m.role === "user")
                .map(m => m.content)
                .join("\n");

            const result = await analyzeDreamAction(dreamText);
            if (result.success) {
                setAnalysis(result.analysis);
            } else {
                alert("分析に失敗しました: " + result.error);
            }
        } catch (e) {
            console.error(e);
            alert("分析エラーが発生しました。");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRecord = async () => {
        if (!analysis) return;
        try {
            const dreamText = messages
                .filter(m => m.role === "user")
                .map(m => m.content)
                .join("\n");

            const result = await recordDreamOnChain(dreamText, analysis);

            if (result.success) {
                setTxHash(result.hash);
            } else {
                alert("記録に失敗しました: " + result.error);
            }
        } catch (e) {
            console.error(e);
            alert("予期せぬエラーが発生しました。");
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8 px-4 flex flex-col h-[calc(100vh-80px)]">
            <header className="mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold">夢語りチャット</h1>
                {analysis && !txHash && (
                    <button onClick={() => setAnalysis(null)} className="text-sm text-muted-foreground hover:underline">
                        分析を閉じて会話に戻る
                    </button>
                )}
            </header>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto mb-6 p-4 bg-secondary/20 rounded-xl space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={cn("flex items-start gap-3", msg.role === "user" ? "flex-row-reverse" : "")}>
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border")}>
                            {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-primary" />}
                        </div>
                        <div className={cn("p-3 rounded-lg max-w-[80%] text-sm leading-relaxed",
                            msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border shadow-sm"
                        )}>
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

            {/* Analysis Result Overlay or Panel */}
            {analysis && (
                <div className="mb-6 p-6 rounded-xl border bg-card animate-in fade-in slide-in-from-bottom-4 shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Sparkles className="text-yellow-500 w-5 h-5" /> 分析レポート
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                        <div className="text-center p-3 bg-red-500/10 rounded-lg">
                            <div className="text-xs text-muted-foreground">ストレス</div>
                            <div className="text-xl font-bold text-red-500">{Math.round(analysis.sentiment.stress * 100)}%</div>
                        </div>
                        <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                            <div className="text-xs text-muted-foreground">不安</div>
                            <div className="text-xl font-bold text-blue-500">{Math.round(analysis.sentiment.anxiety * 100)}%</div>
                        </div>
                        <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
                            <div className="text-xs text-muted-foreground">喜び</div>
                            <div className="text-xl font-bold text-yellow-500">{Math.round(analysis.sentiment.joy * 100)}%</div>
                        </div>
                        <div className="text-center p-3 bg-green-500/10 rounded-lg">
                            <div className="text-xs text-muted-foreground">健康スコア</div>
                            <div className="text-xl font-bold text-green-500">{analysis.score}</div>
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
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> 記録完了!
                            </div>
                            <div className="text-xs font-mono break-all opacity-80 mb-4">{txHash}</div>
                            <button onClick={() => window.location.reload()} className="text-sm underline hover:text-green-800">新しい夢を記録する</button>
                        </div>
                    )}
                </div>
            )}

            {/* Input Area */}
            {!analysis && (
                <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder="メッセージを入力..."
                            className="flex-1 p-3 rounded-lg border bg-card focus:ring-2 focus:ring-primary outline-none shadow-sm"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                    {messages.length > 2 && (
                        <button
                            onClick={handleAnalyze}
                            disabled={isLoading}
                            className="self-center text-sm text-primary hover:underline flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity"
                        >
                            <Sparkles className="w-3 h-3" />
                            ここまでの内容で分析する
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
