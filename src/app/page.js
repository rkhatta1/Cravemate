"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import SocialProof from "@/components/landing/SocialProof";
import FloatingElements from "@/components/landing/FloatingElements";
import Features from "@/components/landing/Features";
import { X } from "lucide-react";

export default function LandingPage() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const handleCTAClick = () => {
    setIsLoading(true);
    if (status === "authenticated") {
      // const hasFinishedOnboarding = session?.user?.hasFinishedOnboarding;
      router.push("/home");
    } else if (status === "unauthenticated") {
      setAuthOpen(true);
      setIsLoading(false);
    }
  };

  const closeAuth = () => {
    setAuthOpen(false);
    setAuthError("");
    setAuthSubmitting(false);
  };

  const handleGoogle = async () => {
    setAuthError("");
    await signIn("google", { callbackUrl: "/home" });
  };

  const handleEmailAuth = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !password) {
        setAuthError("Enter your email and password.");
        return;
      }

      if (authMode === "signup") {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Unable to create account.");
        }
      }

      const result = await signIn("credentials", {
        redirect: false,
        email: normalizedEmail,
        password,
        callbackUrl: "/home",
      });

      if (result?.error) {
        throw new Error(
          result.error === "CredentialsSignin"
            ? "Invalid email or password."
            : result.error
        );
      }

      router.push(result?.url || "/home");
      closeAuth();
    } catch (error) {
      setAuthError(error.message || "Unable to sign in.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-red-100 selection:text-red-900 overflow-x-hidden">
      <Header onSignIn={handleCTAClick} isLoading={isLoading} />

      <main className="relative">
        <Hero onSignIn={handleCTAClick} isLoading={isLoading} />

        {/* Visual Anchor for the "Fold" */}
        <div className="relative z-10 -mt-8 mb-0">
          <FloatingElements />
        </div>
        {/* <SocialProof /> */}
        <Features onSignIn={handleCTAClick} isLoading={isLoading} />

        {/* Footer placeholder */}
        <footer className="bg-neutral-50 py-12 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <div>Cravemate, innit?</div>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-black">
                Privacy
              </a>
              <a href="#" className="hover:text-black">
                Terms
              </a>
              <a href="https://github.com/rkhatta1/Cravemate" target="_blank" className="hover:text-black">
                GitHub
              </a>
            </div>
          </div>
        </footer>
      </main>

      {authOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Welcome to Cravemate
                </p>
                <h2 className="text-2xl font-bold text-gray-900">
                  {authMode === "signup" ? "Create your account" : "Sign in"}
                </h2>
              </div>
              <button
                onClick={closeAuth}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={handleGoogle}
                className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-900"
                disabled={authSubmitting}
              >
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  or
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Email
                  </label>
                  <input
                    type="email"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-yelp-red focus:ring-1 focus:ring-yelp-red/60"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Password
                  </label>
                  <input
                    type="password"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-yelp-red focus:ring-1 focus:ring-yelp-red/60"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                  />
                  {authMode === "signup" && (
                    <p className="mt-1 text-xs text-gray-500">Use 8+ characters.</p>
                  )}
                </div>

                {authError && <p className="text-sm text-red-500">{authError}</p>}

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full rounded-xl bg-yelp-red px-4 py-3 text-sm font-semibold text-white hover:bg-yelp-dark disabled:opacity-60"
                >
                  {authSubmitting
                    ? authMode === "signup"
                      ? "Creating..."
                      : "Signing in..."
                    : authMode === "signup"
                    ? "Create account"
                    : "Sign in"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setAuthError("");
                  setAuthMode((prev) => (prev === "signup" ? "signin" : "signup"));
                }}
                className="w-full text-center text-sm font-semibold text-gray-600 hover:text-gray-900"
              >
                {authMode === "signup"
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
