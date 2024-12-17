/// <reference lib="webworker" />

import { PersistedClient } from "@tanstack/react-query-persist-client";
// import { ICacheOperations } from "./sharedWorkerClient";
import {
  AllPathsType,
  EMessageType,
  IMessage,
  IRequestPayload,
  ResponseEsque,
} from "./type";
import axios, { AxiosError, RawAxiosRequestHeaders } from "axios";
import { ResponseWaiter } from "./responseWaiter";

declare const self: SharedWorkerGlobalScope;

interface ICacheEntity {
  fetchStatus: "idle" | "fetching";
  response: any;
}

class SharedWorker {
  private responseWaiter = new ResponseWaiter<any>();
  private nextConnectionId = 1;
  private connections: Map<number, MessagePort> = new Map();
  // private cache = new Map<string, PersistedClient>();
  private cache = new Map<string, ICacheEntity>();
  constructor() {}

  registerPort(port: MessagePort) {
    const connectionId = this.nextConnectionId++;
    this.connections.set(connectionId, port);

    this.sendMessage(connectionId, {
      type: EMessageType.REGISTERED,
      payload: {
        connections: this.connections.size,
        connectionId,
        // cache: this.cache || "undefined",
      },
    });
    port.onmessage = (event: MessageEvent<IMessage>) =>
      this.handleMessage(connectionId, event.data);

    port.start();

    return connectionId;
  }

  private unregisterConnection(connectionId: number) {
    this.connections.delete(connectionId);
  }

  private sendMessage(connectionId: number, message: IMessage) {
    this.connections.get(connectionId)?.postMessage(message);
  }

  private broadcastMessage(connectionId: number, message: IMessage) {
    this.connections.forEach((port, id) => {
      if (id !== connectionId) {
        port.postMessage(message);
      }
    });
  }

  private async apiRequest(data: IRequestPayload, queryTarget: string) {
    const { url, queryTargets, method, headers, body } = data;

    this.cache.set(queryTarget, {
      fetchStatus: "fetching",
      response: undefined,
    });
    const response = await axios
      .request({
        url,
        method,
        headers: headers as RawAxiosRequestHeaders,
        data: body,
      })
      .then((data) => {
        return data.data;
      })
      .catch((error: AxiosError) => {
        return error.response?.data;
      });
    this.cache.set(queryTarget, { fetchStatus: "idle", response });
    this.responseWaiter.notifyListeners(response, queryTarget);
    return response;
  }

  private async handleMessage(connectionId: number, message: IMessage) {
    switch (message.type) {
      case EMessageType.BROADCAST:
        this.broadcastMessage(connectionId, message);
        break;
      case EMessageType.DISCONNECT:
        this.unregisterConnection(connectionId);
        break;
      // case EMessageType.CACHE: {
      //   this.handleCacheOperations(connectionId, message.payload);
      //   break;
      // }
      case EMessageType.REQUEST: {
        const { queryTargets, isRefetching } = message.payload;
        let response: any;

        const queryTarget = queryTargets.join('","');

        // if ()

        const existingEntity = this.cache.get(queryTarget);

        if (!existingEntity) {
          response = await this.apiRequest(message.payload, queryTarget);
          // const payload: IMessage = {
          //   type: EMessageType.RESPONSE,
          //   payload: {
          //     response,
          //     queryTarget,
          //   },
          //   // cache: this.cache,
          //   // response
          // }
          // this.sendMessage(connectionId, payload);
        }

        if (
          existingEntity &&
          existingEntity.fetchStatus === "idle" &&
          !isRefetching
        ) {
          response = existingEntity.response;
        }

        if (
          existingEntity &&
          existingEntity.fetchStatus === "fetching" &&
          !isRefetching
        ) {
          response = await this.responseWaiter.wait(queryTarget);
        }

        if (existingEntity && isRefetching) {
          if (existingEntity.fetchStatus === "fetching") {
            response = await this.responseWaiter.wait(queryTarget);
          } else {
            response = await this.apiRequest(message.payload, queryTarget);
            this.broadcastMessage(connectionId, {
              type: EMessageType.UPDATE_QUERY_TARGET,
              payload: {
                queryTargets,
                data: response.result.data,
              },
            });
          }
        }

        // if (!existingEntity || isRefetching) {
        //   if (
        //     !!existingEntity &&
        //     isRefetching &&
        //     existingEntity.fetchStatus === "fetching"
        //   ) {
        //     response = await this.responseWaiter.wait(queryTarget);
        //   } else {
        //     response = await this.apiRequest(message.payload);
        // this.responseWaiter.notifyListeners(response, queryTarget);
        //     if (isRefetching) {
        // this.broadcastMessage(connectionId, {
        //   type: EMessageType.UPDATE_QUERY_TARGET,
        //   payload: {
        //     queryTargets,
        //     data: response.result.data,
        //   },
        // });
        //     }
        //   }
        // } else {
        //   if (existingEntity.fetchStatus === "idle") {
        //     response = existingEntity.response;
        //   } else {
        //     response = await this.responseWaiter.wait(queryTarget);
        //   }
        // }

        const payload: IMessage = {
          type: EMessageType.RESPONSE,
          payload: {
            response,
            queryTarget,
          },
          // cache: this.cache,
          // response
        };

        this.sendMessage(connectionId, payload);

        break;
      }
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  // private handleCacheOperations(
  //   connectionId: number,
  //   options: IMessage["payload"]
  // ) {
  //   switch (options.ops) {
  //     case ECacheOps.GET: {
  //       const result = this.cache.get(options.key);
  //       // this.connections.get(connectionId)?.postMessage({ type: EMessageType.CACHE, payload: { cache: result } })
  //       this.sendMessage(connectionId, {
  //         type: EMessageType.CACHE,
  //         payload: { ops: ECacheOps.SET, key: "result", value: result },
  //       });
  //       break;
  //     }
  //     case ECacheOps.DELETE: {
  //       this.cache.delete(options.key);
  //       break;
  //     }
  //     case ECacheOps.SET: {
  //       this.cache.set(options.key, options.value);
  //       this.broadcastMessage(connectionId, { type: EMessageType.CACHE, payload: options })
  //       break;
  //     }
  //   }
  // }
}

const sharedWorkerInstance = new SharedWorker();

self.onconnect = function (event: MessageEvent) {
  const port = event.ports[0];

  sharedWorkerInstance.registerPort(port);
};
