import { TRPCContextProvider } from "./contexts";
import { TestComponent } from "./TestComponent";

export const App = () => {
  return (
    <TRPCContextProvider>
      <TestComponent />
    </TRPCContextProvider>
  );
};
