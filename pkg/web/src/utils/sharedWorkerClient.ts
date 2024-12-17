// import // EMessageType,
// IMessage,
// IMessageBase,
// ICacheMessage,
// "./sharedWorker";

import {
  AllPathsType,
  EMessageType,
  IMessage,
  IRequestPayload,
  ResponseEsque,
  TTRPCUtils,
} from "./type";
// import { updateCachePersister } from "./sharedQueryPersister";
import { queryClient, trpc } from "../contexts";
import { ResponseWaiter } from "./responseWaiter";
import { TRPCClientError } from "@trpc/client";
// import { createDefaultPersister, persisters } from "./sharedQueryPersister";

const instance = new SharedWorker(
  new URL("./sharedWorker.ts", import.meta.url),
  { type: "module", name: "sharedWorker" }
);

class SharedWorkerClient {
  responseWaiter = new ResponseWaiter<ResponseEsque>();
  // cacheInitializer = new CacheInitializer();
  trpcUtils?: TTRPCUtils;
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
        case EMessageType.RESPONSE: {
          // console.log(e.data.payload)
          console.log("response", e.data);
          const result: ResponseEsque = {
            json: () => {
                return e.data.payload.response;
            },
          };
          this.responseWaiter.notifyListeners(
            result,
            e.data.payload.topicTarget
          );
          break;
        }
        case EMessageType.UPDATE_TOPIC_TARGET: {
          console.log("update_targets", e.data);
          if (this.trpcUtils) {
            const result = e.data.payload.topicTargets.reduce(
              (acc: any, key) => {
                const a = acc[key];

                return a;
              },
              this.trpcUtils
            );

            result.setData(e.data.payload.inputs, e.data.payload.data);
          }
          break;
        }
        case EMessageType.INVALIDATE_TOPIC_TARGET: {
          console.log("update_targets", e.data);
          if (this.trpcUtils) {
            const result = e.data.payload.topicTargets.reduce(
              (acc: any, key) => {
                const a = acc[key];

                return a;
              },
              this.trpcUtils
            );

            result.refetch(e.data.payload.inputs);
          }
          break;
        }
        // case EMessageType.CACHE: {
        // console.log(e.data);
        // if (e.data.payload.ops === ECacheOps.SET) {
        //   if (!this.cacheInitializer.isCacheInitializing) {
        //     this.cacheInitializer.notifyListeners(e.data.payload.value);
        //   } else {
        //     // let temp = persisters.default.persistClient;
        //     // persisters.default.persistClient = () => {}
        //     e.data.payload.value?.clientState.queries.forEach((query) => {
        //       queryClient.setQueryData(query.queryKey, (old: any) => query.state.data)
        //     })
        //     // persisters.default.persistClient = temp;
        //     // persistQueryClientRestore({ queryClient, persister: createDefaultPersister(e.data.payload.value), buster: "" })
        //   }
        // }
        // break;
        // }
        default: {
          console.log("unhandled", e.data);
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

  request(payload: IRequestPayload) {
    const message: IMessage = { type: EMessageType.REQUEST, payload };
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

  // async cacheOperations(options: ICacheOperations) {
  //   const message: IMessage = {
  //     type: EMessageType.CACHE,
  //     payload: options,
  //   };
  //   this.instance.port.postMessage(message);

  //   if (options.ops === ECacheOps.GET) {
  //     return await this.cacheInitializer.waitCache();
  //   }
  // }
}

export const sharedWorkerClient = new SharedWorkerClient(instance);
