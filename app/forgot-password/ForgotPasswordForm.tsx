"use client";

import type React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/auth-ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/auth-ui/card";
import { Input } from "@/components/auth-ui/input";
import { Label } from "@/components/auth-ui/label";
import { Loader2, MailCheck } from "lucide-react";
import { useState } from "react";
import { requestPasswordReset } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function ForgotPasswordForm({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });

      if (result?.error) {
        console.error("Password reset request failed:", result.error);
      }
      // Always show the confirmation — never reveal whether the email exists.
      setSubmitted(true);
    } catch (err) {
      console.error("Password reset request error:", err);
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col w-full max-w-md p-4 sm:p-6", className)}>
      <Card className="shadow-none bg-background">
        <div className="max-w-[28rem] mx-auto">
          <CardHeader className="text-center space-y-1 pb-1">
            <CardTitle className="text-base">
              {submitted ? "Check your inbox" : "Forgot your password?"}
            </CardTitle>
            <CardDescription className="text-xs">
              <div className="mb-4">
                {submitted
                  ? "We've sent you a reset link"
                  : "Enter your account email and we'll send you a reset link"}
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="grid gap-4 text-center">
                <div className="flex justify-center">
                  <MailCheck className="h-10 w-10 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  If an account exists for <strong>{email}</strong>, you&apos;ll
                  receive an email with a link to reset your password. The link
                  expires in 1 hour.
                </p>
                <Button
                  type="button"
                  className="w-full bg-black text-white hover:bg-black/80 h-12"
                  onClick={() => router.push("/login")}
                >
                  Back to login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <Label htmlFor="email" className="text-sm">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="me@example.com"
                      className="placeholder:text-gray-500 h-12 border-gray-300"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === " ") {
                          e.preventDefault();
                        }
                      }}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-black text-white hover:bg-black/80 h-12"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending reset link...
                      </div>
                    ) : (
                      <>Send reset link</>
                    )}
                  </Button>
                  {error && (
                    <div className="text-sm text-red-500 text-center">
                      {error}
                    </div>
                  )}
                  <div className="text-center text-xs">
                    Remembered it?{" "}
                    <button
                      type="button"
                      onClick={() => router.push("/login")}
                      className="underline underline-offset-4 hover:text-primary"
                    >
                      Back to login
                    </button>
                  </div>
                </div>
              </form>
            )}
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
