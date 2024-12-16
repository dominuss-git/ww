// import { Driver, EDriverAction, EPaymentType, ESystemSettingsParams } from '@prisma/client';
// import { TRPCError } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';
// import bodyParser from 'body-parser';
import cors from 'cors';
// import CryptoJS from 'crypto-js';
import 'dotenv/config';
// import rateLimit from 'express-rate-limit';
import express, { Request, RequestHandler, Response } from 'express';
import { createContext } from './utils/trpc';
import { appRouter } from './routers';

// import { logStart } from './log';
// import { errorLogger, trpcErrorCodes } from './middlewares';
// import { checkAdminJWT, checkClientJWT, checkDriverJWT } from './middlewares/checkJWT';
// import { errorHandle } from './middlewares/errorHandle';
// import { getAdminProfile, getDriverProfile, getUserProfile } from './middlewares/getUserProfile';


// const limiter = rateLimit({
//   windowMs: 60 * 1000,
//   max: 1,
//   standardHeaders: true,
//   legacyHeaders: false,
// });

const app = express();

app.use(cors({ origin: '*' }));

// app.use(
//   bodyParser.json({
//     limit: process.env.API_PAYLOAD_LIMIT || '4mb',
//     verify(req: Request & { rawBody: Buffer }, res, buf) {
//       req['rawBody'] = buf;
//     },
//   })
// );

app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

// app.use(errorLogger);

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  // logStart('api', PORT);
});
