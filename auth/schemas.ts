import { z } from 'zod';

export const NodeEnv = z.object({
  CLIENT_ID: z.string(),
  CLIENT_SECRET: z.string(),
});

export type NodeEnv = z.infer<typeof NodeEnv>;

export const AuthorizeResponse = z.object({
  code: z.string(),
});

export type AuthorizeResponse = z.infer<typeof AuthorizeResponse>;

export const TokenResponse = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
});

export type TokenResponse = z.infer<typeof TokenResponse>;
