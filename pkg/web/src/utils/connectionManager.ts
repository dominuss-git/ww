import { EMessageType, IMessage, TopicTarget } from "./type";

export class ConnectionManager {
  private nextConnectionId = 1;
  private connections: Map<
    number,
    { port: MessagePort; topics?: Array<string> }
  > = new Map();

  registerPort(port: MessagePort) {
    const connectionId = this.nextConnectionId++;
    this.connections.set(connectionId, { port, topics: [] });

    this.sendMessage(connectionId, {
      type: EMessageType.REGISTERED,
      payload: {
        connections: this.connections.size,
        connectionId,
      },
    });

    return connectionId;
  }

  unregisterConnection(connectionId: number) {
    this.connections.delete(connectionId);
  }

  sendMessage(connectionId: number, message: IMessage) {
    this.connections.get(connectionId)?.port.postMessage(message);
  }

  broadcastMessage(connectionId: number, message: IMessage) {
    this.connections.forEach((connection, id) => {
      if (id !== connectionId) {
        connection.port.postMessage(message);
      }
    });
  }

  broadcastMessageByTargetTopic(
    connectionId: number,
    targetTopic: string,
    message: IMessage
  ) {
    this.connections.forEach((connection, id) => {
      if (id !== connectionId && connection.topics?.includes(targetTopic)) {
        connection.port.postMessage(message);
      }
    });
  }

  broadcastMessageByTopic(
    connectionId: number,
    targetTopic: TopicTarget,
    message: IMessage
  ) {
    this.connections.forEach((connection, id) => {
      if (
        id !== connectionId &&
        connection.topics?.some((topic) => topic.includes(targetTopic))
      ) {
        connection.port.postMessage(message);
      }
    });
  }

  getAllActiveTopics() {
    const activeTopics = new Set<string>();
    this.connections.forEach((connection) => {
      connection.topics?.forEach((topic) => activeTopics.add(topic));
    });

    return activeTopics;
  }

  topicSubscription(connectionId: number, topicTarget: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.set(connectionId, {
        ...connection,
        topics: [
          ...(this.connections.get(connectionId)?.topics || []),
          topicTarget,
        ],
      });
    }
  }

  removeTopics(connectionId: number) {
    const connection = this.connections.get(connectionId);
    if (connection?.topics) {
      this.connections.set(connectionId, {
        ...connection,
        topics: [],
      });
    }
  }
}
