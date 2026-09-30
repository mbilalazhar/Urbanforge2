"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserProfile, UserProfileUpdate } from "@/lib/user-profile";

async function request(input?: UserProfileUpdate): Promise<UserProfile> {
  const response = await fetch("/api/account/profile", {
    method: input ? "PATCH" : "GET", credentials: "same-origin", cache: "no-store",
    ...(input ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) } : {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.profile) throw new Error(data?.message ?? "Unable to load or save your profile. Please try again.");
  return data.profile;
}
export function useProfile(initialProfile: UserProfile) {
  return useQuery({ queryKey: ["user-profile", initialProfile.id], queryFn: () => request(), initialData: initialProfile, staleTime: 0, retry: false });
}
export function useSaveProfile(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: profile => {
      client.setQueryData(["user-profile", id], profile);
      client.setQueryData(["session", "user"], { account: { id: profile.id, name: profile.name, email: profile.email, role: "user" } });
    },
  });
}
