import { trpc } from "../../contexts/TRPCContext";

export const useLongTestQuery = () => {
  const { data, isFetching, refetch, remove, fetchStatus } = trpc.longTest.useQuery(undefined, {
    retry: false,
    // enabled: false,
    refetchOnMount: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  })
  
  return {
    data,
    isLoading: isFetching,
    fetchStatus,
    refetch,
    remove
  }
}