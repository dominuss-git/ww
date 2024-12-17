import { RouterOutputs, trpc } from "../../contexts/TRPCContext";

export type TUser = RouterOutputs["user"];

export const useUsersQuery = () => {
  const { data, error, isFetching, refetch, remove } =
    trpc.user.useQuery({ name: 'hello' }, {
      retry: false,
      // enabled: false,
      refetchOnMount: false,
      refetchInterval: false,
      refetchOnWindowFocus: false,
    });

  return {
    users: data,
    error,
    isLoading: isFetching,
    refetch,
    remove,
  };
};
