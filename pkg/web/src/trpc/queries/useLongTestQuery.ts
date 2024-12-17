import { useEffect, useMemo } from "react";
import { dehydrateClient, queryCache, trpc } from "../../contexts/TRPCContext";
import { QueryCache, useQueryClient } from "@tanstack/react-query";

export const useLongTestQuery = () => {
  const queryClient = useQueryClient()
  
  const a = useMemo(() => {
    const dehydratedClient = dehydrateClient(queryClient);
    return dehydratedClient;
  }, [queryCache])

  const { data, isFetching, refetch, remove, fetchStatus, isLoading, status, error, isRefetching, ...opts } = trpc.longTest.useQuery(undefined, {
    retry: false,
    // enabled: false,
    refetchOnMount: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
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