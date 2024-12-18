import { ApiInstance } from "./apiInstance";
import { TopicTarget } from "./type";

export interface ICacheEntity {
  fetchStatus: "idle" | "fetching";
  response: any;
  inputs: any;
}

interface IStoredEntity extends ICacheEntity {
  timestamp: number;
}

export type RPCMethod = "query" | "mutation";

export class Storage {
  private cache = new Map<string, IStoredEntity>();
  private liveTime: number;

  constructor(data: {revalidateInterval: number, liveTime: number}) {
    this.liveTime = data.liveTime;
    
    setInterval(() => {
      this.clearOutdatedCache();
    }, data.revalidateInterval)
  }

  updateFetchStatus(
    queryHash: {
      url: string;
      topicTarget: TopicTarget;
      rpcMethod: RPCMethod;
    },
    fetchingStatus: ICacheEntity["fetchStatus"],
    inputs?: any
  ): void;
  updateFetchStatus(
    queryHash: string,
    fetchingStatus: ICacheEntity["fetchStatus"],
    inputs?: any
  ): void;
  updateFetchStatus(
    queryHash:
      | { url: string; topicTarget: TopicTarget; rpcMethod: RPCMethod }
      | string,
    fetchingStatus: ICacheEntity["fetchStatus"],
    inputs?: any
  ) {
    const hashKey = this.getKey(queryHash);
    this.cache.set(hashKey, {
      fetchStatus: fetchingStatus,
      response: this.cache.get(hashKey),
      inputs,
      timestamp: new Date().getTime(),
    });
  }

  find(queryHash: {
    url: string;
    topicTarget: TopicTarget;
    rpcMethod: RPCMethod;
  }): ICacheEntity | undefined;
  find(queryHash: string): ICacheEntity | undefined;
  find(
    queryHash:
      | {
          url: string;
          topicTarget: TopicTarget;
          rpcMethod: RPCMethod;
        }
      | string
  ): ICacheEntity | undefined {
    const hashKey = this.getKey(queryHash);
    const existingEntity = this.cache.get(hashKey);
    const accessTimestamp = new Date().getTime();
    if (existingEntity) {
      const { timestamp, ...entity } = existingEntity;
      this.cache.set(hashKey, { ...entity, timestamp: accessTimestamp });
      return entity;
    }
    return existingEntity;
  }

  delete(queryHash: {
    url: string;
    topicTarget: TopicTarget;
    rpcMethod: RPCMethod;
  }): void;
  delete(queryHash: string): void;
  delete(
    queryHash:
      | {
          url: string;
          topicTarget: TopicTarget;
          rpcMethod: RPCMethod;
        }
      | string
  ) {
    const hashKey = this.getKey(queryHash);
    this.cache.delete(hashKey);
  }

  save(
    queryHash: { url: string; topicTarget: TopicTarget; rpcMethod: RPCMethod },
    entity: ICacheEntity
  ): void;
  save(queryHash: string, entity: ICacheEntity): void;
  save(
    queryHash:
      | { url: string; topicTarget: TopicTarget; rpcMethod: RPCMethod }
      | string,
    entity: ICacheEntity
  ) {
    const hashKey = this.getKey(queryHash);
    this.cache.set(hashKey, { ...entity, timestamp: new Date().getTime() });
  }

  private getKey(
    queryHash:
      | { url: string; topicTarget: TopicTarget; rpcMethod: RPCMethod }
      | string
  ) {
    if (typeof queryHash === "string") {
      return queryHash;
    } else {
      return ApiInstance.getQueryHash(
        queryHash.url,
        queryHash.topicTarget,
        queryHash.rpcMethod
      );
    }
  }

  reInvalidate(hashKeys: Set<string>) {
    this.cache.forEach((_, hashKey) => {
      if (!hashKeys.has(hashKey)) {
        this.delete(hashKey);
      }
    });
  }

  private clearOutdatedCache() {
    this.cache.forEach((entity, hashKey) => {
      const currentTimestamp = new Date().getTime();
      if (currentTimestamp - entity.timestamp > this.liveTime) {
        this.delete(hashKey);
      }
    });
  }
}
