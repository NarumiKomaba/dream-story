import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-7xl mx-auto px-4 flex h-14 items-center">
                <Link href="/" className="mr-6 flex items-center space-x-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <span className="font-bold">
                        Dream Story
                    </span>
                </Link>
                <nav className="flex items-center space-x-6 text-sm font-medium">
                    <Link
                        href="/"
                        className="transition-colors hover:text-primary text-foreground/60"
                    >
                        夢を記録
                    </Link>
                    <Link
                        href="/story"
                        className="transition-colors hover:text-primary text-foreground/60"
                    >
                        物語を紡ぐ
                    </Link>
                    <Link
                        href="/stories"
                        className="transition-colors hover:text-primary text-foreground/60"
                    >
                        物語一覧
                    </Link>
                </nav>
            </div>
        </header>
    );
}
