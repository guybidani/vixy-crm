import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getWorkspaceOptions, updateWorkspaceOptions } from "../api/settings";
import { handleMutationError } from "../lib/utils";
import { useAuth } from "./useAuth";
import type { StatusOption } from "./useWorkspaceOptions";

/**
 * Shared mutation for the "Edit Labels" UI in MondayStatusCell.
 *
 * Takes a category key (e.g. "contactStatuses", "dealStages", "priorities")
 * plus the updated labels map and PUTs the merged customOptions back to
 * `/settings/options`. On success it invalidates the workspace-options query
 * so every consumer refetches the fresh labels.
 */
export function useEditLabelsMutation() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useAuth();

  return useMutation({
    mutationFn: async ({
      key,
      updated,
    }: {
      key: string;
      updated: Record<string, StatusOption>;
    }) => {
      // Fetch current customOptions to avoid blowing away other categories.
      const opts = await getWorkspaceOptions();
      const current = (opts.customOptions || {}) as Record<string, unknown>;
      const next = { ...current, [key]: updated };
      return updateWorkspaceOptions(next);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-options", currentWorkspaceId],
      });
      toast.success("תוויות עודכנו");
    },
    onError: (err) => handleMutationError(err, "שגיאה בעדכון תוויות"),
  });
}
