"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/endpoints";
import { favoritesQuery, queryKeys } from "@/lib/api/queries";
import { readOfflineSnapshot, saveOfflineSnapshot } from "@/lib/offline-snapshot";
import { useOnline } from "@/lib/use-online";
import type { FavoriteDto, ListFavoritesResponse } from "@/types/api";
import { useSession } from "./session";
import type { Property } from "@/types/property";

/**
 * Favorites come from `/me/favorites`. Saving and removing update the cached
 * list straight away (hearts and counts react instantly), roll back if the
 * request fails, and refetch afterwards to pick up the server's copy.
 */

const SNAPSHOT = "favorites";

type Change = { kind: "save"; property: Property } | { kind: "remove"; propertyId: string };

function applyChange(list: FavoriteDto[], change: Change): FavoriteDto[] {
  if (change.kind === "remove") return list.filter((f) => f.property.id !== change.propertyId);
  if (list.some((f) => f.property.id === change.property.id)) return list;
  const optimistic: FavoriteDto = {
    property: change.property,
    savedAt: new Date().toISOString(),
    savedPrice: change.property.price,
    note: "",
    status: "active",
  };
  return [optimistic, ...list];
}

async function mutate(client: QueryClient, change: Change) {
  await client.cancelQueries({ queryKey: queryKeys.favorites });
  const previous = client.getQueryData<ListFavoritesResponse>(queryKeys.favorites);
  client.setQueryData<ListFavoritesResponse>(queryKeys.favorites, (old) => ({
    data: applyChange(old?.data ?? [], change),
  }));
  return { previous };
}

export function useFavorites() {
  const client = useQueryClient();
  const { user } = useSession();
  const userId = user?.id;
  const online = useOnline();
  // Offline, the last copy on this device stands in (D14) until the connection returns.
  // The session cannot load offline either (`undefined`); `null` means known to be signed out.
  const snapshot = useMemo(
    () => (user !== null && !online ? readOfflineSnapshot<ListFavoritesResponse>(SNAPSHOT, userId) : undefined),
    [user, userId, online],
  );
  // Favorites belong to an account; signed-out visitors have none.
  const query = useQuery({ ...favoritesQuery, enabled: Boolean(userId), placeholderData: snapshot?.data });
  const { data, isPlaceholderData, isPending, isError, refetch, isFetching } = query;
  const dataUpdatedAt = isPlaceholderData ? (snapshot?.savedAt ?? 0) : query.dataUpdatedAt;

  useEffect(() => {
    if (userId && data && !isPlaceholderData) saveOfflineSnapshot(SNAPSHOT, { userId, savedAt: dataUpdatedAt, data });
  }, [userId, data, isPlaceholderData, dataUpdatedAt]);
  const favorites = useMemo(() => data?.data ?? [], [data]);
  const ids = useMemo(() => favorites.map((f) => f.property.id), [favorites]);

  const { mutate: change } = useMutation({
    mutationFn: async (c: Change): Promise<void> => {
      if (c.kind === "save") await api.saveFavorite(c.property.id);
      else await api.removeFavorite(c.propertyId);
    },
    onMutate: (c) => mutate(client, c),
    onError: (_error, _c, context) => {
      if (context?.previous) client.setQueryData(queryKeys.favorites, context.previous);
    },
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.favorites }),
  });

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);
  const save = useCallback((property: Property) => change({ kind: "save", property }), [change]);
  const remove = useCallback((propertyId: string) => change({ kind: "remove", propertyId }), [change]);
  const toggle = useCallback(
    (property: Property) => (ids.includes(property.id) ? remove(property.id) : save(property)),
    [ids, remove, save],
  );

  return {
    favorites,
    ids,
    count: ids.length,
    isFavorite,
    toggle,
    save,
    remove,
    /** Epoch ms of the copy on screen; older than the visit when it came from the offline snapshot. */
    dataUpdatedAt,
    isPending,
    isError,
    isFetching,
    refetch,
  };
}

/** Edits a favorite's private note, updating the cached list on success. */
export function useFavoriteNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, note }: { propertyId: string; note: string }) =>
      api.updateFavoriteNote(propertyId, note),
    onSuccess: ({ data: updated }) =>
      client.setQueryData<ListFavoritesResponse>(queryKeys.favorites, (old) =>
        old ? { data: old.data.map((f) => (f.property.id === updated.property.id ? updated : f)) } : old,
      ),
  });
}
