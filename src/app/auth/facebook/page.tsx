export default function FacebookAuthFallbackPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 text-center">
      <div className="max-w-sm space-y-3">
        <h1 className="text-lg font-semibold text-foreground">Facebook login completed</h1>
        <p className="text-sm text-muted-foreground">
          You can close this window and return to Pinlo.
        </p>
      </div>
    </main>
  );
}
