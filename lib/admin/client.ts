"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { previewRequest } from "./preview";
export async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`/api/admin/${path}`, { ...options, headers, credentials: "same-origin", cache: "no-store" });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? "Unable to save or load store data.");
  return data as T;
}

export function useAdminQuery<T>(resource: string, source: "preview" | "api" = "api", options: { refetchInterval?: number } = {}) {
  return useQuery({ queryKey: ["admin", source, resource], queryFn: () => source === "api" ? adminRequest<T>(resource) : previewRequest<T>(resource), staleTime: 20_000, retry: false, refetchInterval: options.refetchInterval });
}

export function useAdminMutation(resource: string, source: "preview" | "api" = "api") {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ path = resource, method = "POST", body }: { path?: string; method?: string; body?: unknown }) =>
      (source === "api" ? adminRequest : previewRequest)(path, { method, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin"] }),
        ...(source === "api" ? [client.invalidateQueries({ queryKey: ["catalog"] })] : []),
      ]);
    },
  });
}

export const money = (value: number) => `Rs. ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 }).format(value)}`;
