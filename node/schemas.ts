import { z } from "zod";

export const AuthorizeResponse = z.object({
  code: z.string(),
});

export type AuthorizeResponse = z.infer<typeof AuthorizeResponse>;

export const TokenResponse = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
});

export type TokenResponse = z.infer<typeof TokenResponse>;
