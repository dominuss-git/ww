import { AppRouter } from "../../../api/src/routers";
import { trpc } from "../contexts";

export enum EMessageType {
  BROADCAST = "BROADCAST",
  REGISTERED = "REGISTERED",
  UNREGISTERED = "UNREGISTERED",
  DISCONNECT = "DISCONNECT",
  REQUEST = "REQUEST",
  RESPONSE = "RESPONSE",
  UPDATE_TOPIC_TARGET = "UPDATE_TOPIC_TARGET",
  INVALIDATE_TOPIC_TARGET = "INVALIDATE_TOPIC_TARGET",
  INVALIDATE_CONNECTION = "INVALIDATE_CONNECTION"
}

interface IMessageBase {
  type: EMessageType;
  payload?: any;
}

interface IBroadcastMessage extends IMessageBase {
  type: EMessageType.BROADCAST;
}

interface IRegisteredMessage extends IMessageBase {
  type: EMessageType.REGISTERED;
  payload: {
    connections: number;
    connectionId: number;
  };
}

interface IDisconnectMessage extends IMessageBase {
  type: EMessageType.DISCONNECT;
  payload?: never;
}

export interface IRequestPayload {
  method?: "GET" | "POST";
  body: any;
  headers?: { [key: string]: string } | HeadersInit;
  // signal?: AbortSignal | null;
  url: string;
  topicTargets: AllTopicTargets;
  isRefetching: boolean;
}

interface IRequestMessage extends IMessageBase {
  type: EMessageType.REQUEST;
  payload: IRequestPayload;
}

interface IResponseMessage extends IMessageBase {
  type: EMessageType.RESPONSE;
  payload: {
    response: any;
    status: "success" | "error";
    topicTarget: string;
  };
}

interface IUpdateTopicTargetsMessage extends IMessageBase {
  type: EMessageType.UPDATE_TOPIC_TARGET;
  payload: {
    topicTargets: AllTopicTargets;
    data: any;
    inputs: any;
  };
}

interface IInvalidateTopicTargetsMessage extends IMessageBase {
  type: EMessageType.INVALIDATE_TOPIC_TARGET;
  payload: {
    topicTargets: AllTopicTargets;
    inputs: any;
  };
}

interface IInvalidateConnectionMessage extends IMessageBase {
  type: EMessageType.INVALIDATE_CONNECTION,
  payload?: never,
}

export type IMessage =
  | IDisconnectMessage
  | IRegisteredMessage
  | IBroadcastMessage
  | IRequestMessage
  | IResponseMessage
  | IUpdateTopicTargetsMessage
  | IInvalidateTopicTargetsMessage
  | IInvalidateConnectionMessage;

type WebReadableStreamEsque = {
  getReader: () => ReadableStreamDefaultReader<Uint8Array>;
};

export interface ResponseEsque {
  readonly body?: NodeJS.ReadableStream | WebReadableStreamEsque | null;
  /**
   * @remarks
   * The built-in Response::json() method returns Promise<any>, but
   * that's not as type-safe as unknown. We use unknown because we're
   * more type-safe. You do want more type safety, right? 😉
   */
  json(): Promise<unknown>;
}

type FilterLeafPaths<
  T,
  Exclude extends string,
  Prev extends boolean = true
> = T extends object
  ? {
      [K in keyof T]: K extends Exclude
        ? never
        : T[K] extends object
        ? K extends string
          ? FilterLeafPaths<T[K], Exclude> extends undefined
            ? Prev extends true
              ? [K]
              : K
            : [K, FilterLeafPaths<T[K], Exclude, false>]
          : never
        : never;
    }[keyof T]
  : never;

type ExcludeKeys =
  | "_def"
  | "createCaller"
  | "getErrorShape"
  | "_type"
  | "_procedure"
  | "meta";

export type AllTopicTargets = FilterLeafPaths<AppRouter, ExcludeKeys>;

type PathsToString<T extends string[]> = T extends [infer First, ...infer Rest]
  ? First extends string
    ? Rest extends string[]
      ? PathsToString<Rest> extends never
        ? First
        : `${First}","${PathsToString<Rest>}`
      : First
    : never
  : never;

export type TopicTarget = PathsToString<AllTopicTargets>;

export type TTRPCUtils = ReturnType<typeof trpc.useUtils>;
