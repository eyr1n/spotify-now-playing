import { z } from 'zod';

export const TokenResponse = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
});

export type TokenResponse = z.infer<typeof TokenResponse>;

export const CurrentlyPlayingResponse = z.object({
  progress_ms: z.number().nullable().optional(),
  is_playing: z.boolean().optional(),
  item: z
    .object({
      album: z
        .object({
          external_urls: z.object({
            spotify: z.string().optional(),
          }),
          images: z.array(
            z.object({
              url: z.string(),
              height: z.number().nullable(),
              width: z.number().nullable(),
            }),
          ),
          name: z.string(),
        })
        .optional(),
      artists: z
        .array(
          z.object({
            external_urls: z
              .object({
                spotify: z.string().optional(),
              })
              .optional(),
            name: z.string().optional(),
          }),
        )
        .optional(),
      duration_ms: z.number().optional(),
      external_urls: z
        .object({
          spotify: z.string().optional(),
        })
        .optional(),
      name: z.string().optional(),
    })
    .nullable()
    .optional(),
});

export type CurrentlyPlayingResponse = z.infer<typeof CurrentlyPlayingResponse>;
