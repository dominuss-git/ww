import { useEffect, useState } from "react";
import { useUsersQuery } from "./trpc/queries";
import { sharedWorkerClient } from "./utils/sharedWorkerClient";
import { useLongTestQuery } from "./trpc/queries/useLongTestQuery";
import { trpc } from "./contexts";
import { useUpdateUserMutation } from "./trpc/mutations/useUpdateUserMutation";
import { Link, useNavigate } from "react-router-dom";

export const TestComponent = () => {
  const { users, refetch, error } = useUsersQuery();
  const navigate = useNavigate()
  const {
    data,
    refetch: fetch,
    fetchStatus,
  } = useLongTestQuery();
  const { userUpdate } = useUpdateUserMutation();

  const [state, setState] = useState<number>(0);
  const setRandomValue = () => {
    const newValue = Math.random();
    setState(newValue);
    sharedWorkerClient.broadcastMessage({ state: newValue });
  };

  // const utils = trpc.useUtils();

  // useEffect(() => {
  //   console.log("data", users, data);
  // }, [users, data])

  // useEffect(() => {
  //   console.log(isFetching, fetchStatus, isLoading, status, isRefetching);
  // }, [isFetching, fetchStatus, isLoading, status, isRefetching])


  return (
    <div>
      {JSON.stringify(users, null, 2)}
      <button onClick={() => navigate("/test2")}>go to test2</button>
      <button onClick={() => navigate({ search: '123' })}>search</button>
      {/* <button
        onClick={() =>
          setRandomValue()
        }
      >
        {state}
      </button> */}
      <button onClick={() => refetch({ fetchStatus: "fetching", exact: true })}>
        refetch
      </button>
      <button
        onClick={() =>
          userUpdate({
            password: "string",
            invalidateTargetsOnSuccess: ["user"],
          })
        }
      >
        userUpdate
      </button>
      <button disabled={fetchStatus === "fetching"} onClick={() => fetch()}>
        {data as string}
      </button>
    </div>
  );
};
