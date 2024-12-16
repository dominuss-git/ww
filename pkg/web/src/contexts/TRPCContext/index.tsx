import {
  createTRPCReact,
  httpBatchLink,
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
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AppRouter } from '../../../../api/src/routers/index'
import { persistQueryClient, PersistQueryClientProvider, persistQueryClientRestore, persistQueryClientSubscribe } from "@tanstack/react-query-persist-client";
// import { createSharedPersister } from "../../utils/sharedQueryPersister";
import { sharedWorkerClient } from "../../utils/sharedWorkerClient";
import { ECacheOps } from "../../utils/type";
import { persisters } from "../../utils/sharedQueryPersister";

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

const queryCache = new QueryCache();

queryCache.

const trpcContext = createContext<ITRPCContext | undefined>(undefined);
// export const persister = createSharedPersister();


export const queryClient = new QueryClient({
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
      // onSettled: () => {
      //   console.log("settled")
      //   persistQueryClient({ queryClient, persister: persisters.updatePersister, buster: "" })
      // }
    },
  }
})

export const TRPCContextProvider = ({ children }: { children: ReactNode }) => {
  const [access_token, setAccessToken] = useState<string>();
  // const [persister] = useState(() => createSharedPersister());
  // const [queryClient] = useState(
  //   () => new QueryClient({
  //     defaultOptions: {
  //       queries: {
  //         refetchOnWindowFocus: false,
  //         retry: false,
  //         cacheTime: 1000 * 5 // 5sec,
  //       },
  //     }
  //   })   
  // );
  // console.log(queryClient)

  // persister.

  // useEffect(() => {
  //   console.log(queryClient)
  // }, [queryClient])

  // createHTTPBatchLink

  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: import.meta.env.VITE_API_URL,
            // You can pass any HTTP headers you wish here
            async headers() {
              return {
                authorization: access_token,
              };
            },
          }),
        ],
      }),
    [access_token]
  );

  return (
    <trpcContext.Provider value={{ setAccessToken, access_token }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <PersistQueryClientProvider client={queryClient} persistOptions={{
          persister: persisters.updatePersister,
          buster: "",
          maxAge: 1000 * 60 * 60 * 24 * 2,
        }}>
          {children}
        </PersistQueryClientProvider>
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
