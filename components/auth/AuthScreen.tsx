"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLogin, useSignup } from "@/lib/auth/client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import styles from "./auth.module.css";

type AuthMode = "login" | "signup" | "reset";

const copy = {
  login: {
    eyebrow: "Welcome back",
    title: "Log In to",
    description: "Access your account and continue your journey with us.",
    action: "Log In",
  },
  signup: {
    eyebrow: "Join the movement",
    title: "Sign Up for",
    description: "Make it your own. Join the next generation of urban explorers.",
    action: "Create Account",
  },
  reset: {
    eyebrow: "A fresh start",
    title: "Reset your",
    description: "Enter your email address to request a password reset link.",
    action: "Send Reset Link",
  },
};

export default function AuthScreen({ mode }: { mode: AuthMode }) {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const isSignup = mode === "signup";
  const isReset = mode === "reset";
  const content = copy[mode];
  const router = useRouter();
  const login = useLogin();
  const signup = useSignup();
  const mutation = isSignup ? signup : login;
  const pending = mutation.isPending;

  function clearFeedback() {
    setMessage("");
    mutation.reset();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    clearFeedback();
    const data = new FormData(event.currentTarget);

    if (isSignup && !String(data.get("name") ?? "").trim()) {
      setMessage("Please enter your full name.");
      return;
    }
    if (isSignup && data.get("password") !== data.get("confirmPassword")) {
      setMessage("Your passwords don’t match. Please try again.");
      return;
    }

    if (isReset) {
      setMessage("Password reset isn’t available yet. Please try again later.");
      return;
    }

    const input = {
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    };
    const form = event.currentTarget;
    const options = {
      onSuccess: () => {
        form.reset();
        login.reset();
        signup.reset();
        router.replace("/account");
        router.refresh();
      },
    };
    if (isSignup) signup.mutate({ ...input, name: String(data.get("name") ?? "") }, options);
    else login.mutate(input, options);
  }

  return (
    <main className={`${styles.page} ${isSignup ? styles.signup : ""}`}>
      <div className={styles.card}>
        <div className={styles.photo}>
          <Image src="/jacket.png" alt="UrbanForge explorer wearing a black utility jacket" fill priority sizes="(min-width: 768px) 54vw, 100vw" />
        </div>

        <Link href="/" className={styles.brand} aria-label="UrbanForge home">
          <span className={styles.brandMark} aria-hidden="true">
            <Image src="/logo.svg" alt="" width={82} height={34} />
          </span>
          <span>Urban<span>Forge</span></span>
        </Link>

        <p className={styles.caption}>Premium streetwear.<br />For modern explorers.</p>

        <div className={styles.panel}>
          <p className={styles.switchAccount}>
            {isSignup ? "Already have an account?" : isReset ? "Remember your password?" : "Don’t have an account?"}
            <Link href={isSignup || isReset ? "/login" : "/signup"}>
              {isSignup || isReset ? "Log In" : "Sign Up"} <ArrowRight size={14} />
            </Link>
          </p>

          <div className={styles.formContent}>
            <header className={styles.heading}>
              <span className={styles.accent} aria-hidden="true" />
              <p className={styles.eyebrow}>{content.eyebrow}</p>
              <h1>{content.title}<br /><em>{isReset ? "Password" : "UrbanForge"}</em></h1>
              <p className={styles.description}>{content.description}</p>
            </header>

            <form onSubmit={handleSubmit} onChange={clearFeedback} aria-busy={pending} className={styles.form}>
              {isSignup && (
                <label className={styles.field}>
                  <span className={styles.srOnly}>Full name</span>
                  <UserRound size={18} aria-hidden="true" />
                  <input name="name" placeholder="Full name" autoComplete="name" disabled={pending} required maxLength={100} />
                </label>
              )}
              <label className={styles.field}>
                <span className={styles.srOnly}>Email address</span>
                <Mail size={18} aria-hidden="true" />
                <input name="email" type="email" placeholder="Email address" autoComplete="email" disabled={pending} maxLength={254} required />
              </label>
              {!isReset && (
                <label className={styles.field}>
                  <span className={styles.srOnly}>Password</span>
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input name="password" type={showPassword ? "text" : "password"} placeholder={isSignup ? "Password (at least 8 characters)" : "Password"} autoComplete={isSignup ? "new-password" : "current-password"} minLength={isSignup ? 8 : undefined} maxLength={128} disabled={pending} required />
                  <button type="button" className={styles.visibility} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </label>
              )}
              {isSignup && (
                <label className={styles.field}>
                  <span className={styles.srOnly}>Confirm password</span>
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input name="confirmPassword" type={showPassword ? "text" : "password"} placeholder="Confirm password" autoComplete="new-password" disabled={pending} maxLength={128} required minLength={8} />
                </label>
              )}
              {mode === "login" && <Link href="/forgot-password" className={styles.forgot}>Forgot password?</Link>}

              <p className={styles.feedback} role="status" aria-live="polite">{message || mutation.error?.message}</p>
              <button type="submit" disabled={pending} className={styles.submit}>{pending ? (isSignup ? "Creating account…" : "Logging in…") : content.action}<ArrowRight size={17} strokeWidth={1.5} /></button>
            </form>

            {!isReset && (
              <>
                <div className={styles.divider}><span />Or<span /></div>
                <div className={styles.socials}>
                  <button type="button" onClick={() => setMessage("Google sign-in isn’t available yet. Please try again later.")}><FcGoogle size={21} />Continue with Google</button>
                  <button type="button" onClick={() => setMessage("Apple sign-in isn’t available yet. Please try again later.")}><FaApple size={22} />Continue with Apple</button>
                </div>
                <p className={styles.terms}>By continuing, you agree to our <span>Terms of Service</span> and <span>Privacy Policy</span>.</p>
              </>
            )}
            {isReset && <Link href="/login" className={styles.back}><ArrowLeft size={14} />Back to Log In</Link>}
          </div>
        </div>
      </div>
    </main>
  );
}
