"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queries";
import type { ProfileDto, UpdateProfileRequest, UserDto } from "@/types/api";

/** Writes a fresh profile to the cache and keeps the header's name in step. */
export function useApplyProfile() {
  const client = useQueryClient();
  return (profile: ProfileDto) => {
    client.setQueryData(queryKeys.profile, profile);
    client.setQueryData<UserDto | null>(queryKeys.session, (user) =>
      user ? { ...user, firstName: profile.firstName, lastName: profile.lastName } : user,
    );
  };
}

/**
 * `PATCH /me/profile`. With `optimistic`, the cache changes before the request
 * (switches) and rolls back if it fails.
 */
export function useUpdateProfile({ optimistic = false } = {}) {
  const client = useQueryClient();
  const apply = useApplyProfile();
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => api.updateProfile(body),
    onMutate: async (body) => {
      if (!optimistic) return undefined;
      await client.cancelQueries({ queryKey: queryKeys.profile });
      const previous = client.getQueryData<ProfileDto>(queryKeys.profile);
      if (previous) {
        client.setQueryData<ProfileDto>(queryKeys.profile, {
          ...previous,
          ...(body.notifications && { notifications: { ...previous.notifications, ...body.notifications } }),
          ...(body.marketingOptIn !== undefined && { marketingOptIn: body.marketingOptIn }),
        });
      }
      return { previous };
    },
    onError: (_error, _body, context) => {
      if (context?.previous) client.setQueryData(queryKeys.profile, context.previous);
    },
    onSuccess: ({ data }) => apply(data),
  });
}
