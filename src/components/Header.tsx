import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-7xl mx-auto px-4 flex h-14 items-center justify-between">
                <Link href="/" className="mr-4 sm:mr-6 flex items-center gap-1.5 shrink-0">
                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    <span className="font-bold text-sm sm:text-base">Dream Story</span>
                </Link>
                <nav className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm font-medium">
                    <Link
                        href="/"
                        className="transition-colors hover:text-primary text-foreground/60 whitespace-nowrap"
                    >
                        記録
                    </Link>
                    <Link
                        href="/story"
                        className="transition-colors hover:text-primary text-foreground/60 whitespace-nowrap"
                    >
                        物語
                    </Link>
                    <Link
                        href="/stories"
                        className="transition-colors hover:text-primary text-foreground/60 whitespace-nowrap"
                    >
                        一覧
                    </Link>
                </nav>
            </div>
        </header>
    );
}
