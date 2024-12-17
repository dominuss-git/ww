import { useEffect, useState } from "react";
import { useUsersQuery } from "./trpc/queries";
import { sharedWorkerClient } from "./utils/sharedWorkerClient";
import { useLongTestQuery } from "./trpc/queries/useLongTestQuery";
import { trpc } from "./contexts";

export const TestComponent = () => {
  const { users, refetch } = useUsersQuery();
  const utils = trpc.useUtils();
  const { data, refetch: fetch, isFetching, fetchStatus, isLoading, status, isRefetching } = useLongTestQuery()

  const [state, setState] = useState<number>(0);
  const setRandomValue = () => {
    const newValue = Math.random();
    setState(newValue)
    sharedWorkerClient.broadcastMessage({ state: newValue })
  }

  // const utils = trpc.useUtils();

  useEffect(() => {
    // sharedWorkerClient.subscribe((event) => {
    //   // const a = event.data;
    //   // console.log("message", event);
    //   console.log(event)
    //   if (event?.state) {
    //     setState(event.state)
    //   }
    // })
    console.log("longTest", users);
  }, [users])

  // useEffect(() => {
  //   console.log(isFetching, fetchStatus, isLoading, status, isRefetching);
  // }, [isFetching, fetchStatus, isLoading, status, isRefetching])

  return (
    <div>
      {JSON.stringify(users, null, 2)}
      <button onClick={() => utils.user.setData(undefined, {
        id: "string",
        email: "string",
        password: "string",
        nickname: "string",
      })}>{state}</button>
      <button onClick={() => refetch({ fetchStatus: 'fetching', exact: true })}>refetch</button>
      <button disabled={fetchStatus === 'fetching'} onClick={() => fetch()}>{data as string}</button>
    </div>
  );
};
