import { RouterOutputs, trpc } from "../../contexts/TRPCContext";

export type TUser = RouterOutputs["user"];

export const useUsersQuery = () => {
  const { data, isFetching, refetch, remove } =
    trpc.user.useQuery(undefined, {
      retry: false,
      // enabled: false,
      refetchOnMount: false,
      refetchInterval: false,
      refetchOnWindowFocus: false,
    });

  return {
    users: data,
    isLoading: isFetching,
    refetch,
    remove,
  };
};
