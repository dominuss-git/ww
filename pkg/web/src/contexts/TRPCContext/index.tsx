import {
  createTRPCReact,
  httpBatchLink,
  httpLink,
  inferReactQueryProcedureOptions,
} from "@trpc/react-query";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  defaultShouldDehydrateQuery,
  dehydrate,
  DehydratedState,
  FetchStatus,
  Mutation,
  Query,
  QueryCache,
  QueryCacheNotifyEvent,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ResponseEsque } from "../../../node_modules/@trpc/client/src/internals/types";
import axios, { AxiosError, RawAxiosRequestHeaders } from "axios";

import { AppRouter } from "../../../../api/src/routers/index";
import {
  PersistedClient,
  persistQueryClient,
  PersistQueryClientProvider,
  persistQueryClientRestore,
  persistQueryClientSubscribe,
} from "@tanstack/react-query-persist-client";
import { sharedWorkerClient } from "../../utils/sharedWorkerClient";
import { AllPathsType } from "../../utils/type";
import { ApiInstance } from "../../utils/apiInstance";
// import { createSharedPersister } from "../../utils/sharedQueryPersister";
// import { sharedWorkerClient } from "../../utils/sharedWorkerClient";
// import { ECacheOps } from "../../utils/type";
// import { persisters } from "../../utils/sharedQueryPersister";

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

export const queryCache = new QueryCache();

const trpcContext = createContext<ITRPCContext | undefined>(undefined);
// export const persister = createSharedPersister();

function dehydrateMutation(
  mutation: Mutation
): PersistedClient["clientState"]["mutations"][0] {
  return {
    mutationKey: mutation.options.mutationKey,
    state: mutation.state,
  };
}

// Most config is not dehydrated but instead meant to configure again when
// consuming the de/rehydrated data, typically with useQuery on the client.
// Sometimes it might make sense to prefetch data on the server and include
// in the html-payload, but not consume it on the initial render.
function dehydrateQuery(
  query: Query
): PersistedClient["clientState"]["queries"][0] {
  return {
    state: query.state,
    queryKey: query.queryKey,
    queryHash: query.queryHash,
  };
}

export const dehydrateClient = (client: QueryClient): DehydratedState => {
  return {
    queries: ((client.getQueryCache() as any)?.queries as Array<Query>)?.map(
      (query) => dehydrateQuery(query)
    ),
    mutations: (
      (client.getMutationCache() as any)?.mutation as Array<Mutation>
    )?.map((mutation) => dehydrateMutation(mutation)),
  };
};

const persistClient = (client: QueryClient): PersistedClient => {
  return {
    buster: "",
    timestamp: new Date().getTime(),
    clientState: dehydrateClient(client),
  };
};

export const queryClient = new QueryClient({
  queryCache,
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
      // retryDelay: false,

      retryOnMount: false,
      cacheTime: 1000 * 5, // 5sec,
      onSettled: () => {
        // persistQueryClient({ queryClient, persister: persisters.updatePersister, buster: "" })
        // sharedWorkerClient.cacheOperations({
        //   ops: ECacheOps.SET,
        //   key: "reactQuery",
        //   value: persistClient(queryClient),
        // });
      },
    },
  },
});

const UtilsProxy = ({ children }: { children: ReactNode }) => {
  const utils = trpc.useUtils();
  useEffect(() => {
    console.log("utils");
    sharedWorkerClient.trpcUtils = utils;
  }, [utils]);

  return <>{children}</>;
};

export const TRPCContextProvider = ({ children }: { children: ReactNode }) => {
  const [access_token, setAccessToken] = useState<string>();
  // queryCache.subscribe(
  //   (() => {
  //     let previousStatus: FetchStatus = "idle";
  //     return (cache: QueryCacheNotifyEvent) => {
  //       // console.log("cache", cache);
  //       if (
  //         previousStatus !== "fetching" &&
  //         cache.query.state.fetchStatus === "fetching"
  //       ) {
  //         const persistedClient = persistClient(queryClient);
  //         // sharedWorkerClient.cacheOperations({
  //         //   ops: ECacheOps.SET,
  //         //   key: "reactQuery",
  //         //   value: persistedClient
  //         // });
  //         previousStatus = "fetching";
  //       } else if (cache.query.state.fetchStatus === "idle") {
  //         previousStatus = "idle";
  //       }
  //     };
  //   })()
  // );

  const trpcClient = useMemo(() => {
    // sharedWorkerClient.trpcUtils = utils;
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
            console.log(url, options);
            url = url as string;
            const { method, body, headers, signal } = options!;
            const RPCMethod = method === "GET" ? "query" : "mutation";
            const targetTopics: AllPathsType = url
              .split("/trpc/")[1]
              .split("?")[0]
              .split(".") as AllPathsType;
            const targetTopic = targetTopics.join('","');
            if (RPCMethod === "query") {
              const inputs = ApiInstance.getInputsFromUrl(url);
              const input = [
                ["user"],
                { input: { name: "hello" }, type: "query" },
              ];
              // const input2 = [["user"],{"input":{"name":"hello"},"type:query"}];
              const queryHash = `[["${targetTopic}"],${
                inputs ? `{"input":${JSON.stringify(inputs)},"type":"${RPCMethod}"}` : `{"type":"${RPCMethod}"}`
              }]`;
              const cache = queryCache.get(queryHash);

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
                targetTopics,
                body,
                cache?.state.dataUpdateCount,
                queryHash,
                // queryClient
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

            // const api = new ApiInstance();
            // const result = await api.request({ method: method as 'GET' | 'POST', url, body, headers });
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
        <QueryClientProvider
          client={queryClient}
          // persistOptions={{
          //   persister: persisters.updatePersister,
          //   buster: "",
          //   maxAge: 1000 * 60 * 60 * 24 * 2,
          // }}
        >
          <UtilsProxy>{children}</UtilsProxy>
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
