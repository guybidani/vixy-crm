import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useInlineUpdate<T>(
  updateFn: (id: string, data: Partial<T>) => Promise<any>,
  invalidateKeys: string[][],
) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<T> }) =>
      updateFn(id, data),
    onSuccess: () => {
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
    onError: () => {
      toast.error("שגיאה בעדכון");
    },
  });

  return (id: string, data: Partial<T>) => {
    mutation.mutate({ id, data });
  };
}
