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
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { signIn, signUp } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";

interface LoginFormComponentProps {
  className?: string;
  defaultToSignup?: boolean;
}

export function LoginForm({
  className,
  defaultToSignup = false,
}: LoginFormComponentProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(!defaultToSignup);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/trips";

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasCapital = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
    const hasProblematicChars = /[('"`~,%_;)]/.test(password);

    if (!minLength) {
      return "Password must be at least 8 characters long";
    }
    if (!hasCapital) {
      return "Password must contain at least one capital letter";
    }
    if (!hasSpecialChar) {
      return "Password must contain at least one special character";
    }
    if (hasProblematicChars) {
      return "Password cannot contain these special characters [!@#$%^&*+\"'`()]";
    }
    return "";
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);

    if (!isLogin && newPassword) {
      const error = validatePassword(newPassword);
      setPasswordError(error);
    } else {
      setPasswordError("");
    }
  };

  const handleOAuthSignIn = (provider: string) => {
    setError("");
    setIsLoading(true);
    const onboardingUrl = `/onboarding/account?redirect=${encodeURIComponent(redirectTo)}`;
    signIn.social({
      provider: provider as "google" | "microsoft",
      callbackURL: onboardingUrl,
    });
  };

  const redirectAfterLogin = async () => {
    const accountsResponse = await fetch('/api/accounts');
    if (!accountsResponse.ok) throw new Error('Unable to load accounts');
    const accounts = await accountsResponse.json();
    const destination = accounts.length > 0
      ? redirectTo
      : `/onboarding/account?redirect=${encodeURIComponent(redirectTo)}`;
    router.push(destination);
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);

    if (!isLogin) {
      const passwordValue = formData.get("password") as string;
      const passwordValidationError = validatePassword(passwordValue);
      if (passwordValidationError) {
        setPasswordError(passwordValidationError);
        setIsLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        const result = await signIn.email({
          email: formData.get("email") as string,
          password: formData.get("password") as string,
        });

        if (result?.error) {
          const errorMessage = getErrorMessage(result.error);
          setError(errorMessage);
          console.error("Login failed:", result.error);
          setIsLoading(false);
        } else {
          await redirectAfterLogin();
        }
      } else {
        const emailValue = formData.get("email") as string;
        const nameValue = formData.get("name") as string;
        const result = await signUp.email({
          email: emailValue,
          password: formData.get("password") as string,
          name: nameValue,
        });

        if (result?.error) {
          const errorMessage = getErrorMessage(result.error);
          setError(errorMessage);
          console.error("Sign up failed:", result.error);
          if (isExistingUserError(result.error)) {
            const loginResult = await signIn.email({
              email: emailValue,
              password: formData.get("password") as string,
            });
            if (!loginResult?.error) {
              await redirectAfterLogin();
              return;
            }
            setError("");
            setEmail(emailValue);
            setIsLogin(true);
            setPassword("");
            setSuccessMessage("That email is already registered. Enter your password to log in.");
          }
          setIsLoading(false);
          return;
        }

        setEmail(emailValue);
        setName(nameValue);
        setSuccessMessage(
          "Account created successfully! Please verify your email, then log in to finish setting up your Shldr account."
        );
        setIsLogin(true);
        setPassword("");
        setPasswordError("");
        setIsLoading(false);
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
      console.error("Auth error:", error);
      setIsLoading(false);
    }
  };

  const isExistingUserError = (error: { message?: string; code?: string }) => {
    const code = error.code || "";
    const message = error.message || "";
    return code === "USER_ALREADY_EXISTS" || /already exists|already registered/i.test(message);
  };

  const getErrorMessage = (error: { message?: string; code?: string }) => {
    const code = error.code || "";
    const message = error.message || "";

    if (code === "INVALID_EMAIL_OR_PASSWORD" || message.includes("Invalid email or password")) {
      return "Incorrect email and password combination. Please try again.";
    }
    if (code === "EMAIL_NOT_VERIFIED" || message.includes("Email not verified")) {
      return "Please verify your email address before signing in.";
    }
    if (code === "USER_NOT_FOUND" || message.includes("User not found")) {
      return "No account found with this email address. Please check your email or sign up for a new account.";
    }
    if (code === "USER_ALREADY_EXISTS" || message.includes("already exists")) {
      return "An account with this email already exists. Please sign in instead.";
    }
    return message || "An error occurred during authentication. Please try again.";
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setPassword("");
    setPasswordError("");
    setError("");
    setSuccessMessage("");
  };

  return (
    <div
      className={cn(
        "flex flex-col w-full max-w-md p-4 sm:p-6",
        className
      )}
    >
      <Card className="shadow-none bg-background">
        <div className="max-w-[28rem] mx-auto">
          <CardHeader className="text-center space-y-1 pb-1">
            <CardTitle className="text-base">
              {isLogin ? "Welcome back" : "Create an account"}
            </CardTitle>
            <CardDescription className="text-xs">
              <div className="mb-4">
                {isLogin
                  ? "Login with your Outlook or Google account"
                  : "Sign up with your Outlook or Google account"}
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="hover:bg-gray-100 h-12 border-gray-300"
                  onClick={() => handleOAuthSignIn("google")}
                  disabled={isLoading}
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="hover:bg-gray-100 h-12 border-gray-300"
                  onClick={() => handleOAuthSignIn("microsoft")}
                  disabled={isLoading}
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 23 23">
                    <path fill="#f25022" d="M1 1h10v10H1z" />
                    <path fill="#7fba00" d="M12 1h10v10H12z" />
                    <path fill="#00a4ef" d="M1 12h10v10H1z" />
                    <path fill="#ffb900" d="M12 12h10v10H12z" />
                  </svg>
                  Outlook
                </Button>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4">
                  {!isLogin && (
                    <div className="grid gap-1">
                      <Label htmlFor="name" className="text-sm">
                        Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="John Doe"
                        className="h-12 placeholder:text-gray-500 border-gray-300"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  )}
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
                  <div className="grid gap-1">
                    <div className="flex items-center">
                      <Label htmlFor="password" className="text-sm">
                        Password
                      </Label>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        className={`h-12 border-gray-300 ${passwordError && !isLogin ? "border-red-500" : ""}`}
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
                    {!isLogin && (
                      <div className="text-xs text-gray-600 mt-1">
                        Password must be at least 8 characters with 1 capital
                        letter and 1 special character (!@#$%^&amp;*+)
                      </div>
                    )}
                    {passwordError && !isLogin && (
                      <div className="text-xs text-red-500 mt-1">
                        {passwordError}
                      </div>
                    )}
                    {isLogin && (
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={() => router.push("/forgot-password")}
                          className="text-sm underline-offset-4 hover:underline"
                        >
                          Forgot your password?
                        </button>
                      </div>
                    )}
                  </div>
                  {successMessage && (
                    <div className="text-sm text-green-600 text-center bg-green-50 p-3 rounded mb-4">
                      {successMessage}
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-black text-white hover:bg-black/80 h-12"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isLogin ? "Logging in..." : "Signing up..."}
                      </div>
                    ) : (
                      <>{isLogin ? "Login" : "Sign up"}</>
                    )}
                  </Button>
                  {error && (
                    <div className="text-sm text-red-500 text-center">
                      {error}
                    </div>
                  )}
                </div>
              </form>
              <div className="text-center text-xs">
                {isLogin ? (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={toggleMode}
                      className="underline underline-offset-4 hover:text-primary"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={toggleMode}
                      className="underline underline-offset-4 hover:text-primary"
                    >
                      Login
                    </button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary mt-2">
        By clicking continue, you agree to our{" "}
        <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
