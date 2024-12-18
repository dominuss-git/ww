/// <reference lib="webworker" />

import { EMessageType, IMessage, TopicTarget } from "./type";
import { ApiInstance } from "./apiInstance";
import { ConnectionManager } from "./connectionManager";
import { Storage } from "./storage";

declare const self: SharedWorkerGlobalScope;

class SharedWorker {
  private cache = new Storage({
    revalidateInterval: 1000 * 60 * 5,
    liveTime: 1000 * 60 * 30,
  });
  private connectionManager = new ConnectionManager();
  private api = new ApiInstance(this.cache, this.connectionManager);
  constructor() {}

  private async handleMessage(connectionId: number, message: IMessage) {
    switch (message.type) {
      case EMessageType.BROADCAST:
        this.connectionManager.broadcastMessage(connectionId, message);
        break;
      case EMessageType.DISCONNECT:
        this.connectionManager.unregisterConnection(connectionId);
        const activeTopics = this.connectionManager.getAllActiveTopics();
        this.cache.reInvalidate(activeTopics);
        break;
      case EMessageType.REQUEST: {
        const { topicTargets, method } = message.payload;
        const topicTarget = topicTargets.join('","') as TopicTarget;

        let response: any;
        let status: "success" | "error";

        if (method === "GET") {
          const { status: s, response: r } = await this.api.processQuery(
            connectionId,
            message.payload,
            topicTarget
          );
          response = r;
          status = s;
        } else {
          const { response: r, status: s } = await this.api.processMutation(
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
          },
        };

        this.connectionManager.sendMessage(connectionId, payload);

        break;
      }
      case EMessageType.INVALIDATE_CONNECTION: {
        this.connectionManager.removeTopics(connectionId);
        const activeTopics = this.connectionManager.getAllActiveTopics();
        this.cache.reInvalidate(activeTopics);
        // this.connectionManager.sendMessage(connectionId, {
        //   type: EMessageType.REGISTERED,
        //   payload: this.cache,
        // });
        break;
      }
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  registerPort(port: MessagePort) {
    const connectionId = this.connectionManager.registerPort(port);
    port.onmessage = (e) => {
      this.handleMessage(connectionId, e.data);
    };
    port.start();
  }
}

const sharedWorkerInstance = new SharedWorker();

self.onconnect = function (event: MessageEvent) {
  const port = event.ports[0];

  sharedWorkerInstance.registerPort(port);
};
