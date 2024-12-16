import {
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client";

import { sharedWorkerClient } from "./sharedWorkerClient";
import { ECacheOps } from "./type";

interface ISharedPersister extends Persister {}

function createUpdatePersister(idbValidKey: string = "reactQuery") {
  return {
    persistClient: (client: PersistedClient) => {
      // if (shouldSend(client)) {
        console.log("persist", client.clientState);

        sharedWorkerClient.cacheOperations({
          ops: ECacheOps.SET,
          key: idbValidKey,
          value: client,
        });
      // }
    },
    restoreClient: async () => {
      const result = await sharedWorkerClient.cacheOperations({
        ops: ECacheOps.GET,
        key: idbValidKey,
      });
      console.log("restore");
      return result as PersistedClient;
    },
    removeClient: () => {
      sharedWorkerClient.cacheOperations({
        ops: ECacheOps.DELETE,
        key: idbValidKey,
      });
    },
  } as ISharedPersister;
}

export function createDefaultPersister(data?: PersistedClient) {
  return {
    persistClient: () => {},
    restoreClient: async () => {
      // const result = await sharedWorkerClient.cacheOperations({
      //   ops: ECacheOps.GET,
      //   key: idbValidKey,
      // });
      // console.log("restore");
      // return result as PersistedClient;
      return data;
    },
    removeClient: () => {},
  } as ISharedPersister;
}

export const persisters = {
  // default: createDefaultPersister(),
  updatePersister: createUpdatePersister(),

}
