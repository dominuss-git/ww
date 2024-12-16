import { Prisma, PrismaClient } from '@prisma/client';

import { AppRouter, appRouter } from '../../src/routers';
import { createCallerFactory, RouterInputs, RouterOutputs } from '../../src/utils/trpc';

export type PrismaMockClient = Omit<
  PrismaClient<Prisma.PrismaClientOptions, never>,
  | '$on'
  | '$connect'
  | '$disconnect'
  | '$use'
  | '$executeRaw'
  | '$executeRawUnsafe'
  | '$queryRaw'
  | '$queryRawUnsafe'
  | '$transaction'
  | '$extends'
  | symbol
>;

type TPrismaKey = keyof PrismaMockClient;
type TPrismaFuncKey = keyof Omit<Prisma.UserDelegate, symbol | 'fields'>;

export type FirstParameter<T> = T extends (arg1: infer P) => any ? P : never;

interface IResolver<PKey extends TPrismaKey, TFuncKeys extends TPrismaFuncKey> {
  value?: any;
  condition?: (data: FirstParameter<PrismaMockClient[PKey][TFuncKeys]>) => any;
}

type IResolverFuncs<K extends TPrismaKey> = Partial<{ [TFuncKeys in TPrismaFuncKey]: IResolver<K, TFuncKeys> }>;

type TEntity = Partial<{ [K in TPrismaKey]: IResolverFuncs<K> }>;

const createCaller = createCallerFactory(appRouter);
type TCaller = ReturnType<typeof createCaller>;

function getValueByPath(obj: TCaller, path: AllPathsType) {
  const pathKeys = path.split('.') as PathToTuple<AllPathsType>;
  const router = pathKeys.reduce((acc: any, val) => {
    return acc[val];
  }, obj);

  return router;
}

export const getMockResolver = async <T extends AllPathsType>(
  path: T,
  input: PathToValue<RouterInputs, T>,
  entity: TEntity,
  access_token?: { id: string }
) => {
  const ctx = {
    prisma: Object.keys(entity).reduce(
      (acc, key) => ({
        ...acc,
        [key]: Object.keys(entity[key as TPrismaKey] as IResolverFuncs<TPrismaKey>).reduce((acc, funcKey) => {
          const resolver = entity[key as TPrismaKey]![funcKey as TPrismaFuncKey];
          return {
            ...acc,
            [funcKey]: (data: any) => {
              if (resolver?.condition) {
                return resolver.condition(data);
              }
              return resolver?.value;
            },
          };
        }, {}),
      }),
      {}
    )
  };

  const caller = createCaller(ctx as any);
  const _def = getValueByPath(caller, path);

  return _def(input);
};

type ExcludeKeys = '_def' | 'createCaller' | 'getErrorShape' | '_type' | '_procedure' | 'meta';

type FilterLeafPaths<T, Exclude extends string> = T extends object
  ? {
      [K in keyof T]: K extends Exclude
        ? never
        : T[K] extends object
        ? K extends string
          ? FilterLeafPaths<T[K], Exclude> extends undefined
            ? `${K}`
            : `${K}.${FilterLeafPaths<T[K], Exclude>}`
          : never
        : never;
    }[keyof T]
  : never;

type AllPathsType = FilterLeafPaths<AppRouter, ExcludeKeys>;

type PathToTuple<T extends string> = T extends `${infer Head}.${infer Tail}` ? [Head, ...PathToTuple<Tail>] : [T];

type PathToValue<T, Path extends string> = Path extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? PathToValue<T[Key], Rest>
    : never
  : Path extends keyof T
  ? T[Path]
  : never;

export const selectCondition = (select: any, result: any) => {
  return Object.keys(select).reduce((acc: any, key) => {
    if (select[key]) {
      acc = { ...acc, [key]: undefined };
      acc[key] = result[key];
    }
    return acc;
  }, {});
};

export const deepCopy = <T extends object>(data: T): T => {
  return JSON.parse(JSON.stringify(data));
};
