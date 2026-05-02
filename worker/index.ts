import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { env } from 'hono/adapter';
import { cors } from 'hono/cors';
import { CurrentlyPlayingResponse, TokenResponse } from './schemas';

export class SpotifyToken extends DurableObject {
  async get() {
    return (
      (await this.ctx.storage.get<string>('access_token')) ??
      (await this.refresh())
    );
  }

  async refresh() {
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
    })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error(res.statusText);
        }
        return res.json();
      })
      .then((json) => {
        return TokenResponse.parse(json);
      });

    await this.ctx.storage.put('access_token', response.access_token);
    if (response.refresh_token) {
      await this.ctx.storage.put('refresh_token', response.refresh_token);
    }

    return response.access_token;
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
  const accessToken = await spotifyToken.get();

  const response = await fetch(
    'https://api.spotify.com/v1/me/player/currently-playing?market=JP',
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )
    .then((res) => {
      if (res.status === 204) {
        return {};
      }
      if (res.status !== 200) {
        throw new Error(res.statusText);
      }
      return res.json();
    })
    .then((json) => {
      return CurrentlyPlayingResponse.parse(json);
    });

  return c.json({
    album: {
      name: response.item?.album?.name,
      url: response?.item?.album?.external_urls.spotify,
    },
    artists:
      response.item?.artists?.map((artist) => ({
        name: artist.name,
        url: artist.external_urls?.spotify,
      })) ?? [],
    duration_ms: response.item?.duration_ms,
    images:
      response.item?.album?.images.map((image) => ({
        url: image.url,
        height: image.height,
        width: image.width,
      })) ?? [],
    is_playing: response.is_playing,
    name: response.item?.name,
    progress_ms: response.progress_ms,
    url: response.item?.external_urls?.spotify,
  });
});

export default {
  fetch: app.fetch,
  async scheduled(_: ScheduledEvent, env: Cloudflare.Env) {
    const spotifyToken = env.SPOTIFY_TOKEN.getByName('spotify_token');
    await spotifyToken.refresh();
  },
};
