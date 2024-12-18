import {
  createTRPCReact,
  httpLink,
  inferReactQueryProcedureOptions,
} from "@trpc/react-query";
import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";

import { AppRouter } from "../../../../api/src/routers/index";
import { sharedWorkerClient } from "../../utils/sharedWorkerClient";
import { AllTopicTargets, TopicTarget } from "../../utils/type";
import { ApiInstance } from "../../utils/apiInstance";

export const trpc = createTRPCReact<AppRouter>();

export type ReactQueryOptions = inferReactQueryProcedureOptions<AppRouter>;
export type {
  RouterInputs,
  RouterOutputs,
} from "../../../../api/src/utils/trpc";

interface ITRPCContext {
  setAccessToken: (value: string) => void;
  access_token?: string;
}

// export const queryCache = new QueryCache();

const trpcContext = createContext<ITRPCContext | undefined>(undefined);

// const queryClient =

export const TRPCContextProvider = ({ children }: { children: ReactNode }) => {
  const [access_token, setAccessToken] = useState<string>();
  // const queryClient = useQueryClient();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        // queryCache,
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: false,
            refetchInterval: false,
            refetchOnMount: false,
            refetchIntervalInBackground: false,
            refetchOnReconnect: false,
            
            // keepPreviousData: false,
            // suspense: false,
            // _optimisticResults: "isRestoring",
            // networkMode: "online",

            retryOnMount: false,
            cacheTime: 1000 * 5, // 5sec,
          },
        },
      })
  );

  const trpcClient = useMemo(() => {
    return trpc.createClient({
      links: [
        httpLink({
          url: import.meta.env.VITE_API_URL,
          // You can pass any HTTP headers you wish here
          async headers() {
            return {
              authorization: access_token,
            };
          },
          async fetch(url, options) {
            url = url as string;
            const { method, body, headers, signal } = options!;
            const RPCMethod = method === "GET" ? "query" : "mutation";
            const targetTopics: AllTopicTargets = url
              .split("/trpc/")[1]
              .split("?")[0]
              .split(".") as AllTopicTargets;
            const targetTopic = targetTopics.join('","') as TopicTarget;
            if (RPCMethod === "query") {
              const queryHash = ApiInstance.getQueryHash(
                url,
                targetTopic,
                RPCMethod
              );
              const cache = queryClient.getQueryCache().get(queryHash) || {
                state: { dataUpdateCount: 0 },
              };

              sharedWorkerClient.request({
                url,
                method: method as "GET" | "POST",
                body,
                headers,
                topicTargets: targetTopics,
                isRefetching: cache?.state.dataUpdateCount !== 0,
              });
              console.log(
                "request",
                url,
                options,
                targetTopic,
                body,
                // queryClient.getQueryCache()
              );
            } else {
              sharedWorkerClient.request({
                url,
                method: method as "GET" | "POST",
                body,
                headers,
                topicTargets: targetTopics,
                isRefetching: false,
              });
            }

            return await sharedWorkerClient.responseWaiter.wait(targetTopic);

            // const result = await ApiInstance.request({ method: method as 'GET' | 'POST', url, body, headers });
            // return {
            //   json: () => result.response
            // }
          },
        }),
      ],
    });
  }, [access_token]);

  return (
    <trpcContext.Provider value={{ setAccessToken, access_token }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </trpc.Provider>
    </trpcContext.Provider>
  );
};

export const useTRPCContext = () => {
  const context = useContext(trpcContext);

  if (!context) {
    throw Error("TRPCContext should be used only with TRPCContextProvider");
  }

  return context;
};
