import { PersistedClient } from "@tanstack/react-query-persist-client";

export enum ECacheOps {
  SET = "SET",
  GET = "GET",
  DELETE = "DELETE",
}

export enum EMessageType {
  BROADCAST = "BROADCAST",
  REGISTERED = "REGISTERED",
  UNREGISTERED = "UNREGISTERED",
  DISCONNECT = "DISCONNECT",
  CACHE = "CACHE",
}

interface ICacheOperationsBase {
  ops: ECacheOps;
  key: string;
}

interface ICacheOperationsSet extends ICacheOperationsBase {
  ops: ECacheOps.SET;
  value?: PersistedClient;
}

interface ICacheOperationsGetOrDelete extends ICacheOperationsBase {
  ops: ECacheOps.GET | ECacheOps.DELETE;
}

export type ICacheOperations =
  | ICacheOperationsGetOrDelete
  | ICacheOperationsSet;

interface IMessageBase {
  type: EMessageType
  payload?: any
}

interface ICacheMessage extends IMessageBase {
  type: EMessageType.CACHE;
  payload: ICacheOperations;
}

interface IBroadcastMessage extends IMessageBase {
  type: EMessageType.BROADCAST;
}

interface IRegisteredMessage extends IMessageBase {
  type: EMessageType.REGISTERED;
  payload: {
    connections: number;
    connectionId: number,
  }
}

interface IDisconnectMessage extends IMessageBase {
  type: EMessageType.DISCONNECT,
  payload?: never
}

export type IMessage = ICacheMessage | IDisconnectMessage | IRegisteredMessage | IBroadcastMessage;