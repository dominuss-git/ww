import axios, { AxiosError, RawAxiosRequestHeaders } from "axios";
import { IRequestPayload } from "./type";

export class ApiInstance {
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
  async request({
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
        console.log((error.response?.data as any).error)
        return {
          response: { error: (error.response?.data as any).error },
          status: "error",
        };
      })) as { response: any; status: "success" | "error" };

    return { response, status };
  }
}
