"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/endpoints";
import { queryKeys, sessionQuery } from "@/lib/api/queries";
import { clearOfflineSnapshots } from "@/lib/offline-snapshot";
import { useHydrated } from "@/lib/use-hydrated";
import type { UserDto } from "@/types/api";

/**
 * The signed-in user. `user` is `null` when signed out and `undefined` while loading.
 *
 * Always "loading" while the component hydrates: the server has no session, and a Suspense
 * boundary that hydrates after the session query answered would otherwise render signed-in
 * markup over the server's and fail hydration (React #418).
 */
export function useSession() {
  const hydrated = useHydrated();
  const { data, isPending } = useQuery(sessionQuery);
  if (!hydrated) return { user: undefined, isPending: true, isSignedIn: false };
  return { user: data, isPending, isSignedIn: Boolean(data) };
}

/** Puts a freshly signed-in user into the cache and reloads anything tied to the account. */
export function useApplySession() {
  const client = useQueryClient();
  return (user: UserDto) => {
    client.setQueryData(queryKeys.session, user);
    void client.invalidateQueries({ queryKey: queryKeys.favorites });
  };
}

export function useSignOut() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      client.setQueryData(queryKeys.session, null);
      // Everything under ["me", …] belongs to the account that just left.
      client.removeQueries({ queryKey: ["me"] });
      clearOfflineSnapshots();
    },
  });
}

export const displayName = (user: Pick<UserDto, "firstName" | "lastName">) => `${user.firstName} ${user.lastName}`;
