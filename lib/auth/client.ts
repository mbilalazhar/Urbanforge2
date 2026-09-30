"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mergeGuestCart } from "@/lib/cart-store";
import { notifyUserSessionChanged } from "./events";
import type { AccountRole, LoginInput, SessionResponse, SignupInput } from "./types";

const basePath = (role: AccountRole) => role === "admin" ? "/api/admin" : "/api/auth";
const sessionKey = (role: AccountRole) => ["session", role] as const;

async function request(path: string, body?: LoginInput | SignupInput | Record<string, never>, signal?: AbortSignal): Promise<SessionResponse> {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    signal,
    credentials: "same-origin",
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "Unable to complete the request. Please try again.");
  if (!data || !("account" in data)) throw new Error("Unexpected response. Please try again.");
  return data;
}

export function useLogin(role: AccountRole = "user") {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => request(`${basePath(role)}/login`, input),
    onSuccess: async data => {
      await client.cancelQueries({ queryKey: sessionKey(role) });
      if (role === "user" && data.account) await mergeGuestCart(data.account.id);
      client.setQueryData(sessionKey(role), data);
      if (role === "user") { client.removeQueries({ queryKey: ["user-profile"] }); notifyUserSessionChanged(); }
    },
  });
}

export function useSignup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SignupInput) => request("/api/auth/signup", input),
    onSuccess: async data => {
      await client.cancelQueries({ queryKey: sessionKey("user") });
      if (data.account) await mergeGuestCart(data.account.id);
      client.setQueryData(sessionKey("user"), data);
      client.removeQueries({ queryKey: ["user-profile"] });
      notifyUserSessionChanged();
    },
  });
}

export function useSession(role: AccountRole, initialData?: SessionResponse) {
  return useQuery({
    queryKey: sessionKey(role),
    queryFn: ({ signal }) => request(`${basePath(role)}/session`, undefined, signal),
    initialData,
    staleTime: 0,
    retry: false,
  });
}

export function useLogout(role: AccountRole) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => request(`${basePath(role)}/logout`, {}),
    onSuccess: async data => {
      await client.cancelQueries({ queryKey: sessionKey(role) });
      if (role === "user" && data.account) await mergeGuestCart(data.account.id);
      client.setQueryData(sessionKey(role), data);
      if (role === "user") { client.removeQueries({ queryKey: ["user-profile"] }); notifyUserSessionChanged(); }
      // Remove cached mutation inputs, which may contain login credentials.
      client.getMutationCache().clear();
    },
  });
}
