import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { env } from 'hono/adapter';
import { cors } from 'hono/cors';
import {
  CurrentlyPlayingResponse,
  type SpotifyNowPlaying,
  TokenResponse,
} from './schemas';

export class SpotifyToken extends DurableObject {
  async getAccessToken() {
    return (
      (await this.ctx.storage.get<string>('access_token')) ??
      (await this.refreshAccessToken())
    );
  }

  async refreshAccessToken() {
    const refreshToken =
      (await this.ctx.storage.get<string>('refresh_token')) ??
      this.env.REFRESH_TOKEN;

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${this.env.CLIENT_ID}:${this.env.CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.env.CLIENT_ID,
      }),
    });
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    const token = TokenResponse.parse(await response.json());

    await this.ctx.storage.put('access_token', token.access_token);
    if (token.refresh_token) {
      await this.ctx.storage.put('refresh_token', token.refresh_token);
    }

    return token.access_token;
  }
}

const app = new Hono<{ Bindings: Cloudflare.Env }>();

app.use(
  '*',
  cors({
    origin: 'https://iwair.in',
  }),
);

app.get('/', async (c) => {
  const spotifyToken = env(c).SPOTIFY_TOKEN.getByName('spotify_token');
  const accessToken = await spotifyToken.getAccessToken();

  const response = await fetch(
    'https://api.spotify.com/v1/me/player/currently-playing',
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const currentlyPlaying = CurrentlyPlayingResponse.parse(
    await response.json(),
  );
  if (response.status === 204 || !currentlyPlaying.item) {
    return c.json(null);
  }

  return c.json({
    name: currentlyPlaying.item?.name,
    url: currentlyPlaying.item?.external_urls?.spotify,
    album: {
      name: currentlyPlaying.item.album.name,
      url: currentlyPlaying.item.album.external_urls.spotify,
    },
    artists: currentlyPlaying.item.artists.map((artist) => ({
      name: artist.name,
      url: artist.external_urls.spotify,
    })),
    images: currentlyPlaying.item.album.images.map((image) => ({
      url: image.url,
      width: image.width,
      height: image.height,
    })),
    duration_ms: currentlyPlaying.item.duration_ms,
    progress_ms: currentlyPlaying.progress_ms,
    is_playing: currentlyPlaying.is_playing,
  } satisfies SpotifyNowPlaying);
});

export default {
  fetch: app.fetch,

  async scheduled(_: ScheduledEvent, env: Cloudflare.Env) {
    const spotifyToken = env.SPOTIFY_TOKEN.getByName('spotify_token');
    await spotifyToken.refreshAccessToken();
  },
};
