import { z } from 'zod';

export const TokenResponse = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
});

export type TokenResponse = z.infer<typeof TokenResponse>;

export const TrackObject = z.object({
  album: z.object({
    external_urls: z.object({
      spotify: z.string(),
    }),
    images: z.array(
      z.object({
        url: z.string(),
        height: z.number().nullable(),
        width: z.number().nullable(),
      }),
    ),
    name: z.string(),
  }),
  artists: z.array(
    z.object({
      external_urls: z.object({
        spotify: z.string(),
      }),
      name: z.string(),
    }),
  ),
  duration_ms: z.number(),
  external_urls: z.object({
    spotify: z.string(),
  }),
  name: z.string(),
});

export type TrackObject = z.infer<typeof TrackObject>;

export const CurrentlyPlayingResponse = z.object({
  progress_ms: z.number().nullable(),
  is_playing: z.boolean(),
  item: TrackObject.nullable(),
});

export type CurrentlyPlayingResponse = z.infer<typeof CurrentlyPlayingResponse>;

export interface SpotifyNowPlaying {
  name: string;
  url: string;
  album: {
    name: string;
    url: string;
  };
  artists: {
    name: string;
    url: string;
  }[];
  images: {
    url: string;
    width: number | null;
    height: number | null;
  }[];
  duration_ms: number;
  progress_ms: number | null;
  is_playing: boolean;
}
