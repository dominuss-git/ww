import { useEffect, useState } from "react";
import { useUsersQuery } from "./trpc/queries";
import { sharedWorkerClient } from "./utils/sharedWorkerClient";
import { useLongTestQuery } from "./trpc/queries/useLongTestQuery";

export const TestComponent = () => {
  const { users, refetch } = useUsersQuery();
  const { data, refetch: fetch, isLoading, fetchStatus } = useLongTestQuery()

  const [state, setState] = useState<number>(0);
  const setRandomValue = () => {
    const newValue = Math.random();
    setState(newValue)
    sharedWorkerClient.broadcastMessage({ state: newValue })
  }

  useEffect(() => {
    sharedWorkerClient.subscribe((event) => {
      // const a = event.data;
      // console.log("message", event);
      console.log(event)
      if (event?.state) {
        setState(event.state)
      }
    })
  }, [])

  useEffect(() => {
    console.log(fetchStatus);
  }, [fetchStatus])

  return (
    <div>
      {JSON.stringify(users, null, 2)}
      <button onClick={setRandomValue}>{state}</button>
      <button onClick={() => refetch()}>refetch</button>
      <button disabled={fetchStatus === 'fetching'} onClick={() => fetch()}>{data as string}</button>
    </div>
  );
};
