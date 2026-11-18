"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/endpoints";
import { queryKeys, sessionQuery } from "@/lib/api/queries";
import type { UserDto } from "@/types/api";

/** The signed-in user. `user` is `null` when signed out and `undefined` while loading. */
export function useSession() {
  const { data, isPending } = useQuery(sessionQuery);
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
      client.removeQueries({ queryKey: queryKeys.favorites });
    },
  });
}

export const displayName = (user: Pick<UserDto, "firstName" | "lastName">) => `${user.firstName} ${user.lastName}`;
export const initial = (user: Pick<UserDto, "firstName">) => user.firstName.charAt(0) || "?";
