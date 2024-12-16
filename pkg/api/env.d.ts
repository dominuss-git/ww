/// <reference types="@types/node" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly DATABASE_URL: string,
      readonly SALT_ROUNDS: string,
      readonly ACCESS_TOKEN_EXPIRES_IN: string,
      readonly ACCESS_TOKEN_SECRET: string
    }
  }
}

export {}