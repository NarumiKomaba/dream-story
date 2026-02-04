import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background">
            <div className="container flex h-14 items-center">
                <Link href="/" className="mr-6 flex items-center space-x-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <span className="hidden font-bold sm:inline-block">
                        Dream Chain
                    </span>
                </Link>
                <nav className="flex items-center space-x-6 text-sm font-medium">
                    <Link
                        href="/dream/new"
                        className="transition-colors hover:text-foreground/80 text-foreground/60"
                    >
                        夢を記録
                    </Link>
                    <Link
                        href="/story"
                        className="transition-colors hover:text-foreground/80 text-foreground/60"
                    >
                        物語を見る
                    </Link>
                </nav>
            </div>
        </header>
    );
}
