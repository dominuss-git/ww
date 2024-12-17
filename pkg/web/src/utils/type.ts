import { PersistedClient } from "@tanstack/react-query-persist-client";
import { AppRouter } from "../../../api/src/routers";
import { trpc } from "../contexts";

// export enum ECacheOps {
//   SET = "SET",
//   GET = "GET",
//   DELETE = "DELETE",
// }

export enum EMessageType {
  BROADCAST = "BROADCAST",
  REGISTERED = "REGISTERED",
  UNREGISTERED = "UNREGISTERED",
  DISCONNECT = "DISCONNECT",
  // CACHE = "CACHE",
  REQUEST = "REQUEST",
  RESPONSE = "RESPONSE",
  UPDATE_QUERY_TARGET = "UPDATE_QUERY_TARGET",
}

// interface ICacheOperationsBase {
//   ops: ECacheOps;
//   key: string;
// }

// interface ICacheOperationsSet extends ICacheOperationsBase {
//   ops: ECacheOps.SET;
//   value?: PersistedClient;
// }

// interface ICacheOperationsGetOrDelete extends ICacheOperationsBase {
//   ops: ECacheOps.GET | ECacheOps.DELETE;
// }

// export type ICacheOperations =
//   | ICacheOperationsGetOrDelete
//   | ICacheOperationsSet;

interface IMessageBase {
  type: EMessageType;
  payload?: any;
}

// interface ICacheMessage extends IMessageBase {
//   type: EMessageType.CACHE;
//   payload: ICacheOperations;
// }

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
  queryTargets: AllPathsType;
  isRefetching: boolean;
}

interface IRequestMessage extends IMessageBase {
  type: EMessageType.REQUEST;
  payload: IRequestPayload;
}

interface IResponseMessage extends IMessageBase {
  type: EMessageType.RESPONSE;
  payload: {
    response: any,
    queryTarget: string;
  };
}

interface IInvalidateQueryTargets extends IMessageBase {
  type: EMessageType.UPDATE_QUERY_TARGET;
  payload: {
    queryTargets: AllPathsType;
    data: any
  };
}

export type IMessage =
  // | ICacheMessage
  | IDisconnectMessage
  | IRegisteredMessage
  | IBroadcastMessage
  | IRequestMessage
  | IResponseMessage
  | IInvalidateQueryTargets;

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

export type AllPathsType = FilterLeafPaths<AppRouter, ExcludeKeys>;

type FieldTypes<T, K extends keyof T> = T[K];

export type TTRPCUtils = ReturnType<typeof trpc.useUtils>;

export type ExtractedTypes<T extends TTRPCUtils = TTRPCUtils> = {
  [K in AllPathsType[number]]: FieldTypes<T, K>;
};