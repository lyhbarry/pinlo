"use client";

import { useState } from "react";
import Link from "next/link";
import { signup } from "@/app/actions/auth";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MailCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignupPage() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"email" | "password", string[]>>>({});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setFieldErrors({});

    const trimmedEmail = email.trim().toLowerCase();
    const nextErrors: Partial<Record<"email" | "password", string[]>> = {};

    if (!trimmedEmail) {
      nextErrors.email = ["Please enter a valid email."];
    }
    if (!password || password.length < 8) {
      nextErrors.password = ["Password must be at least 8 characters."];
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setPending(true);
    try {
      const result = await signup(trimmedEmail, password);

      if (result.errors) {
        setFieldErrors({
          email: result.errors.email,
          password: result.errors.password,
        });
        return;
      }

      if (result.message) {
        setMessage(result.message);
        return;
      }

      if (result.pendingConfirmation) {
        setDone(true);
        return;
      }

      setMessage("Signup failed. Please try again.");
    } catch (error) {
      console.error("[signup] signup action failed", error);
      setMessage("Signup failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <LogoMark size={32} />
              <span className="text-xl font-bold text-foreground">Pinlo</span>
            </Link>
          </div>
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MailCheck className="w-6 h-6 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Check your email</CardTitle>
              <CardDescription>
                We sent a confirmation link to your inbox. Click it to activate your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Didn&apos;t get it? Check your spam folder or{" "}
                <Link href="/signup" className="text-primary hover:underline font-medium">
                  try again
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={32} />
            <span className="text-xl font-bold text-foreground">Pinlo</span>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>Start managing WhatsApp conversations at scale</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {message && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                  {message}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="jane@acme.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email[0]}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password[0]}</p>}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 mt-2">
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating account…</> : "Create account"}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
