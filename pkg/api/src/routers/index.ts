import { publicProcedure, router, TRPC_ERROR_CODES_NAMES } from '../utils/trpc';
import Users from '../../prisma/seeds/data/User.json';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

const randomNumber = Math.floor(Math.random() * 10);
let user = Users[randomNumber];

export const appRouter = router({
  user: publicProcedure.input(z.object({ name: z.string() })).query(({ ctx }) => {
    console.log("user")
    throw new TRPCError({ code: TRPC_ERROR_CODES_NAMES.BAD_REQUEST })
    return user;
  }),
  updateUser: publicProcedure
    .input(
      z.object({
        password: z.string(),
      })
    )
    .mutation(({ input }) => {
      user.password = input.password;

      return user;
    }),
  users: router({
    user: publicProcedure.query(({ ctx }) => {
      const randomNumber = Math.floor(Math.random() * 10);
      // ctx.prisma.user.findMany();
      console.log('user');
      return Users[randomNumber];
    }),
  }),
  longTest: publicProcedure.query(async ({ ctx }) => {
    let resolver: (value: unknown) => void;
    const promise = () => new Promise((resolve) => (resolver = resolve));

    setTimeout(() => {
      if (resolver) {
        resolver(Math.random());
      }
    }, 5 * 1000);
    console.log('longTest');
    return await promise();
  }),
});

export type AppRouter = typeof appRouter;
