"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccountRole, LoginInput, SessionResponse, SignupInput } from "./types";

const basePath = (role: AccountRole) => role === "admin" ? "/api/admin" : "/api/auth";
const sessionKey = (role: AccountRole) => ["session", role] as const;

async function request(path: string, body?: LoginInput | SignupInput | Record<string, never>): Promise<SessionResponse> {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
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
    onSuccess: data => client.setQueryData(sessionKey(role), data),
  });
}

export function useSignup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SignupInput) => request("/api/auth/signup", input),
    onSuccess: data => client.setQueryData(sessionKey("user"), data),
  });
}

export function useSession(role: AccountRole, initialData?: SessionResponse) {
  return useQuery({
    queryKey: sessionKey(role),
    queryFn: () => request(`${basePath(role)}/session`),
    initialData,
    staleTime: 0,
    retry: false,
  });
}

export function useLogout(role: AccountRole) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => request(`${basePath(role)}/logout`, {}),
    onSuccess: data => {
      client.setQueryData(sessionKey(role), data);
      // Remove cached mutation inputs, which may contain login credentials.
      client.getMutationCache().clear();
    },
  });
}
