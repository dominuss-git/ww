import { inferRouterInputs, inferRouterOutputs, initTRPC, TRPCError } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';

import { prisma } from './prisma';
import { AppRouter } from '../routers';

// created for each request
export const createContext = ({ req, res }: trpcExpress.CreateExpressContextOptions) => ({
  prisma,
  req,
}); // no context
export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

export const TRPC_ERROR_CODES_NAMES = {
  /**
   * Invalid JSON was received by the server.
   * An error occurred on the server while parsing the JSON text.
   */
  PARSE_ERROR: 'PARSE_ERROR', // -32700
  /**
   * The JSON sent is not a valid Request object.
   */
  BAD_REQUEST: 'BAD_REQUEST', // -32600 // 400

  // Internal JSON-RPC error
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR', // -32603
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED', // -32603

  // Implementation specific errors
  UNAUTHORIZED: 'UNAUTHORIZED', // -32001 // 401
  FORBIDDEN: 'FORBIDDEN', // -32003 // 403
  NOT_FOUND: 'NOT_FOUND', // -32004 // 404
  METHOD_NOT_SUPPORTED: 'METHOD_NOT_SUPPORTED', // -32005 // 405
  TIMEOUT: 'TIMEOUT', // -32008 // 408
  CONFLICT: 'CONFLICT', // -32009 // 409
  PRECONDITION_FAILED: 'PRECONDITION_FAILED', // -32012 // 412
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE', // -32013 // 413
  UNPROCESSABLE_CONTENT: 'UNPROCESSABLE_CONTENT', // -32022 // 422
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS', // -32029 // 429
  CLIENT_CLOSED_REQUEST: 'CLIENT_CLOSED_REQUEST', // -32099 // 499
} as const;

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
