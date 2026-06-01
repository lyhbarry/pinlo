import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import AuthConfirm from "./auth-confirm";

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AuthConfirm />
    </Suspense>
  );
}
