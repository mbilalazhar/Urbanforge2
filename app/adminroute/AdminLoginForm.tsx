"use client";
import { FeedbackNotice } from "@/components/ui/Feedback";

import { PendingContent } from "@/components/ui/Skeleton";
import { type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLogin } from "@/lib/auth/client";
import styles from "./admin.module.css";

export default function AdminLoginForm() {
  const login = useLogin("admin");
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (login.isPending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    login.mutate({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    }, { onSuccess: () => { form.reset(); login.reset(); router.refresh(); } });
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="admin-login-title">
        <p className={styles.brand}>URBAN<span>FORGE</span><small>STORE ADMINISTRATION</small></p>
        <p className={styles.eyebrow}>YOUR STORE, AT A GLANCE</p>
        <h1 id="admin-login-title">Admin Login</h1>
        <p className={styles.description}>Welcome back. Sign in to manage your store.</p>

        <form className={styles.form} onSubmit={handleSubmit} onChange={() => login.reset()} aria-busy={login.isPending}>
          <label htmlFor="admin-email">Email address</label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            maxLength={254}
            placeholder="admin@example.com"
            disabled={login.isPending}
            required
          />

          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            disabled={login.isPending}
            required
          />

          <button type="submit" disabled={login.isPending}><PendingContent pending={login.isPending}>{"Sign in to your store →"}</PendingContent></button>
          <FeedbackNotice>{login.error?.message}</FeedbackNotice>
        </form>
      </section>
    </main>
  );
}
