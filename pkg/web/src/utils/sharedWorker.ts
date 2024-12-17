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
import { ApiInstance } from "./apiInstance";

declare const self: SharedWorkerGlobalScope;

interface ICacheEntity {
  fetchStatus: "idle" | "fetching";
  response: any;
  inputs: any;
}

class SharedWorker {
  private responseWaiter = new ResponseWaiter<{
    status: "success" | "error";
    response: any;
  }>();
  private nextConnectionId = 1;
  private connections: Map<number, MessagePort> = new Map();
  // private cache = new Map<string, PersistedClient>();
  private api = new ApiInstance();
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

  private async apiRequest(
    data: IRequestPayload,
    topicTarget: string,
    connectionId: number
  ) {
    const { url, method, headers, body } = data;
    // try {
    const inputs = this.api.getInputsFromUrl(url);
    this.cache.set(topicTarget, {
      fetchStatus: "fetching",
      response: undefined,
      inputs,
    });

    const { response, status } = await this.api.request({
      url,
      method,
      headers,
      body,
    });

    this.cache.set(topicTarget, { fetchStatus: "idle", response, inputs });
    this.responseWaiter.notifyListeners({ response, status }, topicTarget);
    return { response, status, inputs };
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
        const { topicTargets: queryTargets, method } = message.payload;
        const topicTarget = queryTargets.join('","');

        let response: any;
        let status: "success" | "error";
        if (method === "GET") {
          const { status: s, response: r } = await this.processQuery(
            connectionId,
            message.payload,
            topicTarget
          );
          response = r;
          status = s;
        } else {
          const { response: r, status: s } = await this.processMutation(
            connectionId,
            message.payload,
            topicTarget
          );

          response = r;
          status = s;
        }

        const payload: IMessage = {
          type: EMessageType.RESPONSE,
          payload: {
            response,
            status,
            topicTarget: topicTarget,
            cache: this.cache,
          },
          // cache: this.cache
          // response
        };

        this.sendMessage(connectionId, payload);

        break;
      }
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  private async processMutation(
    connectionId: number,
    message: IRequestPayload,
    topicTarget: string
  ) {
    const { response, status } = await this.apiRequest(
      message,
      topicTarget,
      connectionId
    );
    if (status === "success") {
      const body: {
        [key: string]: any;
        invalidateTargetsOnSuccess: AllPathsType;
      } = JSON.parse(message.body);

      const topicTarget = body.invalidateTargetsOnSuccess.join('","');

      const inputs = this.cache.get(topicTarget)?.inputs;

      this.sendMessage(connectionId, {
        type: EMessageType.INVALIDATE_TOPIC_TARGET,
        payload: { topicTargets: body.invalidateTargetsOnSuccess, inputs },
      });
      this.broadcastMessage(connectionId, {
        type: EMessageType.INVALIDATE_TOPIC_TARGET,
        payload: { topicTargets: body.invalidateTargetsOnSuccess, inputs },
      });
    }
    return response;
  }

  private async processQuery(
    connectionId: number,
    message: IRequestPayload,
    topicTarget: string
  ) {
    const { isRefetching, topicTargets: queryTargets } = message;
    let response: any;
    let status: "success" | "error" = "success";
    const existingEntity = this.cache.get(topicTarget);

    if (!existingEntity) {
      const { response: output, status: s } = await this.apiRequest(
        message,
        topicTarget,
        connectionId
      );
      status = s;
      response = output;
    }

    if (
      existingEntity &&
      existingEntity.fetchStatus === "idle" &&
      !isRefetching
    ) {
      response = existingEntity.response;
      status = "success";
    }

    if (
      existingEntity &&
      existingEntity.fetchStatus === "fetching" &&
      !isRefetching
    ) {
      const { response: r, status: s } = await this.responseWaiter.wait(
        topicTarget
      );
      response = r;
      status = s;
    }

    if (existingEntity && isRefetching) {
      if (existingEntity.fetchStatus === "fetching") {
        const { response: r, status: s } = await this.responseWaiter.wait(
          topicTarget
        );
        response = r;
        status = s;
      } else {
        const {
          response: output,
          inputs,
          status: s,
        } = await this.apiRequest(message, topicTarget, connectionId);
        response = output;
        status = s;
        if (status === 'success') {
          this.broadcastMessage(connectionId, {
            type: EMessageType.UPDATE_TOPIC_TARGET,
            payload: {
              topicTargets: queryTargets,
              data: status === "success" ? response.result.data : response.error,
              inputs,
            },
          });
        }
      }
    }

    return { status, response };
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
