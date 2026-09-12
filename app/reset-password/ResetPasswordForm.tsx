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
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { resetPassword } from "@/lib/auth-client";
import { validatePassword } from "@/lib/password-validation";
import { useRouter, useSearchParams } from "next/navigation";

export function ResetPasswordForm({ className }: { className?: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const urlError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const router = useRouter();

  const invalidLink = !token || !!urlError;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const validationError = validatePassword(password);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPassword({ newPassword: password, token: token! });
      if (result?.error) {
        const code = result.error.code || "";
        if (code === "INVALID_TOKEN" || /expired|invalid/i.test(result.error.message || "")) {
          setError("This reset link has expired or is invalid. Please request a new one.");
        } else {
          setError(result.error.message || "Couldn't reset your password. Please try again.");
        }
      } else {
        setSucceeded(true);
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setPasswordError(e.target.value ? validatePassword(e.target.value) : "");
  };

  return (
    <div className={cn("flex flex-col w-full max-w-md p-4 sm:p-6", className)}>
      <Card className="shadow-none bg-background">
        <div className="max-w-[28rem] mx-auto">
          <CardHeader className="text-center space-y-1 pb-1">
            <CardTitle className="text-base">
              {invalidLink
                ? "Reset link expired"
                : succeeded
                  ? "Password updated"
                  : "Set a new password"}
            </CardTitle>
            <CardDescription className="text-xs">
              <div className="mb-4">
                {invalidLink
                  ? "This reset link is invalid or has expired"
                  : succeeded
                    ? "You can now log in with your new password"
                    : "Choose a new password for your Shldr account"}
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invalidLink ? (
              <div className="grid gap-4">
                <Button
                  type="button"
                  className="w-full bg-black text-white hover:bg-black/80 h-12"
                  onClick={() => router.push("/forgot-password")}
                >
                  Request a new reset link
                </Button>
                <div className="text-center text-xs">
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    Back to login
                  </button>
                </div>
              </div>
            ) : succeeded ? (
              <div className="grid gap-4 text-center">
                <div className="flex justify-center">
                  <ShieldCheck className="h-10 w-10 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Your password has been reset. Any existing sessions have been
                  signed out.
                </p>
                <Button
                  type="button"
                  className="w-full bg-black text-white hover:bg-black/80 h-12"
                  onClick={() => router.push("/login")}
                >
                  Log in
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <Label htmlFor="password" className="text-sm">
                      New password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        className={`h-12 border-gray-300 ${passwordError ? "border-red-500" : ""}`}
                        value={password}
                        onChange={handlePasswordChange}
                        onKeyDown={(e) => {
                          if (e.key === " ") {
                            e.preventDefault();
                          }
                        }}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="sr-only">
                          {showPassword ? "Hide password" : "Show password"}
                        </span>
                      </Button>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Password must be at least 8 characters with 1 capital
                      letter and 1 special character (!@#$%^&amp;*+)
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="confirm-password" className="text-sm">
                      Confirm new password
                    </Label>
                    <Input
                      id="confirm-password"
                      name="confirm-password"
                      type={showPassword ? "text" : "password"}
                      className="h-12 border-gray-300"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === " ") {
                          e.preventDefault();
                        }
                      }}
                      required
                    />
                    {passwordError && (
                      <div className="text-xs text-red-500 mt-1">
                        {passwordError}
                      </div>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-black text-white hover:bg-black/80 h-12"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Resetting password...
                      </div>
                    ) : (
                      <>Reset password</>
                    )}
                  </Button>
                  {error && (
                    <div className="text-sm text-red-500 text-center">
                      {error}
                    </div>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
