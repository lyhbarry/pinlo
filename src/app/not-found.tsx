import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="font-bold text-foreground">Pinlo</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-6xl font-bold text-primary mb-4">404</p>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Page not found
          </h1>
          <p className="text-muted-foreground mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Home</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
