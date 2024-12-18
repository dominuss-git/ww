import axios, { AxiosError, RawAxiosRequestHeaders } from "axios";

import {
  AllTopicTargets,
  EMessageType,
  IRequestPayload,
  TopicTarget,
} from "./type";
import { ResponseWaiter } from "./responseWaiter";
import { ConnectionManager } from "./connectionManager";
import { Storage } from "./storage";

export class ApiInstance {
  constructor(
    private cache: Storage,
    private connectionManager: ConnectionManager
  ) {}
  private responseWaiter = new ResponseWaiter<{
    status: "success" | "error";
    response: any;
  }>();

  static getQueryHash(
    url: string,
    targetTopic: TopicTarget,
    RPCMethod: "query" | "mutation"
  ) {
    const inputs = this.getInputsFromUrl(url);

    return `[["${targetTopic}"],${
      inputs
        ? `{"input":${JSON.stringify(inputs)},"type":"${RPCMethod}"}`
        : `{"type":"${RPCMethod}"}`
    }]`;
  }
  static getInputsFromUrl(url: string) {
    const inputsString = url.split("input=")[1];
    const inputs = !inputsString ? undefined : decodeURIComponent(inputsString);
    if (!inputs) return;
    try {
      return JSON.parse(inputs);
    } catch (e) {
      return inputs;
    }
  }
  getInputsFromUrl(url: string) {
    const inputsString = url.split("input=")[1];
    const inputs = !inputsString ? undefined : decodeURIComponent(inputsString);
    if (!inputs) return;
    try {
      return JSON.parse(inputs);
    } catch (e) {
      return inputs;
    }
  }
  private async request({
    url,
    method,
    headers,
    body,
  }: Omit<IRequestPayload, "isRefetching" | "topicTargets">) {
    const { response, status } = (await axios
      .request({
        url,
        method,
        headers: headers as RawAxiosRequestHeaders,
        data: body,
      })
      .then((data) => {
        return { response: data.data, status: "success" };
      })
      .catch((error: AxiosError) => {
        console.log((error.response?.data as any).error);
        return {
          response: { error: (error.response?.data as any).error },
          status: "error",
        };
      })) as { response: any; status: "success" | "error" };

    return { response, status };
  }

  private async apiRequest(data: IRequestPayload, topicTarget: TopicTarget) {
    const { url, method, headers, body } = data;
    const inputs = this.getInputsFromUrl(url);
    const rpcMethod = method === "GET" ? "query" : "mutation";
    const hashKey = ApiInstance.getQueryHash(url, topicTarget, rpcMethod);
    this.cache.updateFetchStatus(hashKey, "fetching", inputs);

    const { response, status } = await this.request({
      url,
      method,
      headers,
      body,
    });

    this.cache.save(hashKey, { fetchStatus: "idle", response, inputs });
    this.responseWaiter.notifyListeners({ response, status }, hashKey);
    return { response, status, inputs };
  }

  async processMutation(
    connectionId: number,
    message: IRequestPayload,
    topicTarget: TopicTarget
  ) {
    const { response, status } = await this.apiRequest(message, topicTarget);
    if (status === "success") {
      const body: {
        [key: string]: any;
        invalidateTargetsOnSuccess: AllTopicTargets;
      } = JSON.parse(message.body);

      const topicTarget = body.invalidateTargetsOnSuccess.join(
        '","'
      ) as TopicTarget;

      // TODO: reinvalidate all queries
      const inputs = undefined;

      this.connectionManager.sendMessage(connectionId, {
        type: EMessageType.INVALIDATE_TOPIC_TARGET,
        payload: { topicTargets: body.invalidateTargetsOnSuccess, inputs },
      });
      this.connectionManager.broadcastMessageByTopic(
        connectionId,
        topicTarget,
        {
          type: EMessageType.INVALIDATE_TOPIC_TARGET,
          payload: { topicTargets: body.invalidateTargetsOnSuccess, inputs },
        }
      );
    }
    return { response, status };
  }

  async processQuery(
    connectionId: number,
    message: IRequestPayload,
    topicTarget: TopicTarget
  ) {
    const { isRefetching, topicTargets, url } = message;
    this.connectionManager.topicSubscription(
      connectionId,
      ApiInstance.getQueryHash(url, topicTarget, "query")
    );

    let response: any;
    let status: "success" | "error" = "success";
    const existingEntity = this.cache.find({
      url,
      topicTarget,
      rpcMethod: "query",
    });

    if (!existingEntity) {
      const { response: r, status: s } = await this.apiRequest(
        message,
        topicTarget
      );
      response = r;
      status = s;
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
        ApiInstance.getQueryHash(url, topicTarget, "query")
      );
      response = r;
      status = s;
    }

    if (existingEntity && isRefetching) {
      if (existingEntity.fetchStatus === "fetching") {
        const { response: r, status: s } = await this.responseWaiter.wait(
          ApiInstance.getQueryHash(url, topicTarget, "query")
        );
        response = r;
        status = s;
      } else {
        const {
          response: r,
          inputs,
          status: s,
        } = await this.apiRequest(message, topicTarget);
        response = r;
        status = s;
        if (status === "success") {
          this.connectionManager.broadcastMessageByTargetTopic(
            connectionId,
            ApiInstance.getQueryHash(url, topicTarget, "query"),
            {
              type: EMessageType.UPDATE_TOPIC_TARGET,
              payload: {
                topicTargets,
                data:
                  status === "success" ? response.result.data : response.error,
                inputs,
              },
            }
          );
        }
      }
    }

    return { status, response };
  }
}
