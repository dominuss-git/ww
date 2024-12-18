import { useNavigate } from "react-router-dom";
import { useLongTestQuery } from "./trpc/queries/useLongTestQuery";

export const TestComponent2 = () => {
  const navigate = useNavigate()
  const { fetchStatus, refetch: fetch, data } = useLongTestQuery()

  return (
    <div>
      <button onClick={() => navigate("/")}>go to test1</button>
      Test2
      {/* <button
        onClick={() =>
          setRandomValue()
        }
      >
        {state}
      </button> */}
      {/* <button onClick={() => refetch({ fetchStatus: "fetching", exact: true })}>
        refetch
      </button> */}
      {/* <button
        onClick={() =>
          userUpdate({
            password: "string",
            invalidateTargetsOnSuccess: ["user"],
          })
        }
      >
        userUpdate
      </button> */}
      <button disabled={fetchStatus === "fetching"} onClick={() => fetch()}>
        {data as string}
      </button>
    </div>
  );
};
