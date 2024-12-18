import { RouterInputs, trpc } from "../../contexts";
import { AllTopicTargets } from "../../utils/type";

type IUserUpdateInput = RouterInputs["updateUser"] & {
  invalidateTargetsOnSuccess: AllTopicTargets
}

export const useUpdateUserMutation = () => {
  const {
    mutate,
    isLoading
  } = trpc.updateUser.useMutation({
    retry: false,
  });

  const userUpdate = (input: IUserUpdateInput) => {
    mutate(input, {
      onSuccess(data) {
        console.log(data);
      }
    })
  }

  return {
    userUpdate
  };
};
