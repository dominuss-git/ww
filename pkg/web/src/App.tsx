import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";

import { trpc, TRPCContextProvider } from "./contexts";
import { TestComponent } from "./TestComponent";
import { TestComponent2 } from "./TestComponent2";
import { sharedWorkerClient } from "./utils/sharedWorkerClient";
import { useQueryClient } from "@tanstack/react-query";

const UtilsProxy = ({ children }: { children: ReactNode }) => {
  const utils = trpc.useUtils();
  const location = useLocation();
  const queryClient = useQueryClient();
  // const [isUpdating, setUpdateStatus] = useState<boolean>(true);
  // const cache = queryClient.getQueryCache();
  const [prevPath, setPrev] = useState<string>(location.pathname);
  useEffect(() => {
    sharedWorkerClient.trpcUtils = utils;
  }, [utils]);

  // useEffect(() => {
  //   cache.subscribe((e) => {
  //     console.log("cache", cache)
  //   })
  // }, [cache])

  useEffect(() => {
    if (prevPath !== location.pathname) {
      sharedWorkerClient.invalidateConnection();
      queryClient.resetQueries()
      setPrev(location.pathname);
    }
  }, [location.pathname, queryClient, prevPath]);

  return <>{children}</>;
};

export const App = () => {
  return (
    <TRPCContextProvider>
      <BrowserRouter>
        <UtilsProxy>
          <Routes>
            {/* <Route path="/" element={<Layout />}> */}
            <Route index element={<TestComponent />} />
            <Route path="test2" element={<TestComponent2 />} />
            {/* </Route> */}
          </Routes>
        </UtilsProxy>
      </BrowserRouter>
    </TRPCContextProvider>
  );
};
