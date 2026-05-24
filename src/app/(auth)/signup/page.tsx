"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, {});

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">P</span>
            </div>
            <span className="text-xl font-bold text-foreground">Pinlo</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>
              Start managing WhatsApp conversations at scale
            </CardDescription>
          </CardHeader>

          <form action={action}>
            <CardContent className="space-y-4">
              {state.message && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                  {state.message}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="orgName">Organization name</Label>
                <Input
                  id="orgName"
                  name="orgName"
                  placeholder="Acme Inc."
                  autoComplete="organization"
                />
                {state.errors?.orgName && (
                  <p className="text-xs text-destructive">{state.errors.orgName[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Jane Smith"
                  autoComplete="name"
                />
                {state.errors?.name && (
                  <p className="text-xs text-destructive">{state.errors.name[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="jane@acme.com"
                  autoComplete="email"
                />
                {state.errors?.email && (
                  <p className="text-xs text-destructive">{state.errors.email[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                />
                {state.errors?.password && (
                  <p className="text-xs text-destructive">{state.errors.password[0]}</p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 mt-2">
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Creating account…" : "Create account"}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
