"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useLogout, useSession } from "@/lib/auth/client";
import type { UserProfile } from "@/lib/user-profile";
import type { PublicAccount } from "@/lib/auth/types";
import ProfilePage from "@/components/account/ProfilePage";
import styles from "@/app/adminroute/admin.module.css";

export default function AccountPanel({ account, profile }: { account: PublicAccount; profile: UserProfile }) {
  const router = useRouter();
  const session = useSession(account.role, { account });
  const logout = useLogout(account.role);
  const loginPath = account.role === "admin" ? "/adminroute" : "/login";

  useEffect(() => {
    if (session.data?.account === null) {
      router.replace(loginPath);
      router.refresh();
    }
  }, [session.data, router, loginPath]);

  if (account.role === "user") {
    return <ProfilePage
      initialProfile={profile}
      loggingOut={logout.isPending}
      error={logout.error?.message || session.error?.message}
      onLogout={() => logout.mutate(undefined, {
        onSuccess: () => { router.replace(loginPath); router.refresh(); },
      })}
    />;
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.brand}>UrbanForge</p>
        <h1>{account.role === "admin" ? "Admin account" : "My account"}</h1>
        <p className={styles.description}>Welcome, {session.data?.account?.name ?? account.name}.</p>
        <p className={styles.description}>{session.data?.account?.email ?? account.email}</p>
        <div className={styles.form}>
          <button type="button" disabled={logout.isPending} onClick={() => logout.mutate(undefined, {
            onSuccess: () => { router.replace(loginPath); router.refresh(); },
          })}>{logout.isPending ? "Logging out…" : "Log Out"}</button>
          <p className={styles.feedback} role="status">{logout.error?.message || session.error?.message}</p>
        </div>
      </section>
    </main>
  );
}
