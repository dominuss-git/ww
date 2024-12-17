import { publicProcedure, router } from '../utils/trpc';
import Users from '../../prisma/seeds/data/User.json';
import { z } from 'zod';

export const appRouter = router({
  user: publicProcedure.query(({ ctx }) => {
    const randomNumber = Math.floor(Math.random() * 10)
    // ctx.prisma.user.findMany();
    console.log("user")
    return Users[randomNumber];
  }),
  users: router({
    user: publicProcedure.query(({ ctx }) => {
      const randomNumber = Math.floor(Math.random() * 10)
      // ctx.prisma.user.findMany();
      console.log("user")
      return Users[randomNumber];
    }),
  }),
  longTest: publicProcedure.query(async ({ ctx }) => {
    let resolver: (value: unknown) => void;
    const promise = () => new Promise((resolve) => resolver = resolve)

    setTimeout(() => {
      if (resolver) {
        resolver(Math.random())
      }
    }, 5 * 1000)
    console.log("longTest")
    return await promise();
  }),
});

export type AppRouter = typeof appRouter;
