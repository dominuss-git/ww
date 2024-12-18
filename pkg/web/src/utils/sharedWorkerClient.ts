import {
  EMessageType,
  IMessage,
  IRequestPayload,
  ResponseEsque,
  TTRPCUtils,
} from "./type";
import { ResponseWaiter } from "./responseWaiter";
import React from "react";

const instance = new SharedWorker(
  new URL("./sharedWorker.ts", import.meta.url),
  { type: "module", name: "sharedWorker" }
);

class SharedWorkerClient {
  responseWaiter = new ResponseWaiter<ResponseEsque>();
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

  private disconnect() {
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

  invalidateConnection() {
    this.postMessage({ type: EMessageType.INVALIDATE_CONNECTION });
  }

  subscribe(callback: (event: IMessage["payload"]) => void) {
    const id = "";
    this.listeners.set(id, callback);

    return id;
  }

  unsubscribe(id: string) {
    this.listeners.delete(id);
  }
}

export const sharedWorkerClient = new SharedWorkerClient(instance);
