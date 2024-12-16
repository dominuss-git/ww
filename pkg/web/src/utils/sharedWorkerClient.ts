import {
  PersistedClient,
  persistQueryClient,
  persistQueryClientRestore,
  persistQueryClientSave,
} from "@tanstack/react-query-persist-client";
// import // EMessageType,
// IMessage,
// IMessageBase,
// ICacheMessage,
// "./sharedWorker";

import { ECacheOps, EMessageType, ICacheOperations, IMessage } from "./type";
// import { updateCachePersister } from "./sharedQueryPersister";
import { queryClient } from "../contexts";
import { createDefaultPersister, persisters } from "./sharedQueryPersister";

const instance = new SharedWorker(
  new URL("./sharedWorker.ts", import.meta.url),
  { type: "module", name: "sharedWorker" }
);

class CacheInitializer {
  private changeListeners: Array<(value: unknown) => void> = [];
  isCacheInitializing: boolean = false;

  waitCache() {
    return new Promise((resolve) => {
      this.changeListeners.push(resolve);
    });
  }

  notifyListeners(data?: PersistedClient) {
    this.changeListeners.forEach((listener) => {
      listener(data);
    });
    this.changeListeners = [];
    this.isCacheInitializing = true;
  }
}

class SharedWorkerClient {
  cacheInitializer = new CacheInitializer();
  listeners = new Map<string, (event: IMessage["payload"]) => void>();
  constructor(private instance: SharedWorker) {
    window.addEventListener("beforeunload", () => {
      this.disconnect();
    });

    this.instance.port.onmessage = (e: MessageEvent<IMessage>) => {
      switch (e.data.type) {
        case EMessageType.REGISTERED: {
          console.log(e.data);
          break;
        }
        case EMessageType.CACHE: {
          console.log(e.data);
          if (e.data.payload.ops === ECacheOps.SET) {
            if (!this.cacheInitializer.isCacheInitializing) {
              this.cacheInitializer.notifyListeners(e.data.payload.value);
            } else {
              // let temp = persisters.default.persistClient;
              // persisters.default.persistClient = () => {}
              // e.data.payload.value?.clientState.queries.forEach((query) => {
              //   queryClient.setQueryData(query.queryKey, query.state.data)
              // })
              // persisters.default.persistClient = temp;
              persistQueryClientRestore({ queryClient, persister: createDefaultPersister(e.data.payload.value), buster: "" })
            }
          }
          break;
        }
        default: {
          this.listeners.forEach((listener) => listener(e.data.payload));
        }
      }
    };
  }

  private postMessage(message: IMessage) {
    this.instance.port.postMessage(message);
  }

  disconnect() {
    this.postMessage({ type: EMessageType.DISCONNECT });
  }

  broadcastMessage(payload: any) {
    const message: IMessage = { type: EMessageType.BROADCAST, payload };
    this.postMessage(message);
  }

  subscribe(callback: (event: IMessage["payload"]) => void) {
    const id = "";
    this.listeners.set(id, callback);

    return id;
  }

  unsubscribe(id: string) {
    this.listeners.delete(id);
  }

  async cacheOperations(options: ICacheOperations) {
    const message: IMessage = {
      type: EMessageType.CACHE,
      payload: options,
    };
    this.instance.port.postMessage(message);

    if (options.ops === ECacheOps.GET) {
      return await this.cacheInitializer.waitCache();
    }
  }
}

export const sharedWorkerClient = new SharedWorkerClient(instance);
