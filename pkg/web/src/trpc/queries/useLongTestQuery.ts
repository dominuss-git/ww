import { trpc } from "../../contexts/TRPCContext";

export const useLongTestQuery = () => {
  const { data, isFetching, refetch, remove, fetchStatus, isLoading, status, error, isRefetching } = trpc.longTest.useQuery(undefined, {
    // retry: false,
    // // enabled: false,
    // refetchOnMount: false,
    // refetchInterval: false,
    // refetchOnWindowFocus: false,
  })
  
  return {
    data,
    isLoading: isLoading,
    isFetching,
    status,
    fetchStatus,
    isRefetching,
    refetch,
    remove
  }
}
