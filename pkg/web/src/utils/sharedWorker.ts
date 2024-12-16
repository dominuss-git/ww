/// <reference lib="webworker" />

import { PersistedClient } from "@tanstack/react-query-persist-client";
// import { ICacheOperations } from "./sharedWorkerClient";
import { ECacheOps, EMessageType, IMessage } from "./type";

declare const self: SharedWorkerGlobalScope;

class SharedWorker {
  private nextConnectionId = 1;
  private connections: Map<number, MessagePort> = new Map();
  private cache = new Map<string, PersistedClient>();
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

  private handleMessage(connectionId: number, message: IMessage) {
    switch (message.type) {
      case EMessageType.BROADCAST:
        this.broadcastMessage(connectionId, message);
        break;
      case EMessageType.DISCONNECT:
        this.unregisterConnection(connectionId);
        break;
      case EMessageType.CACHE: {
        this.handleCacheOperations(connectionId, message.payload);
        break;
      }
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  private handleCacheOperations(
    connectionId: number,
    options: IMessage["payload"]
  ) {
    switch (options.ops) {
      case ECacheOps.GET: {
        const result = this.cache.get(options.key);
        // this.connections.get(connectionId)?.postMessage({ type: EMessageType.CACHE, payload: { cache: result } })
        this.sendMessage(connectionId, {
          type: EMessageType.CACHE,
          payload: { ops: ECacheOps.SET, key: "result", value: result },
        });
        break;
      }
      case ECacheOps.DELETE: {
        this.cache.delete(options.key);
        break;
      }
      case ECacheOps.SET: {
        this.cache.set(options.key, options.value);
        this.broadcastMessage(connectionId, { type: EMessageType.CACHE, payload: options })
        break;
      }
    }
  }
}

const sharedWorkerInstance = new SharedWorker();

self.onconnect = function (event: MessageEvent) {
  const port = event.ports[0];

  sharedWorkerInstance.registerPort(port);
};
