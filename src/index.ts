import { Hono } from "hono";
import { cors } from "hono/cors";
import { CurrentlyPlayingResponse, TokenResponse } from "./schemas";

async function refreshAccessToken(env: Cloudflare.Env) {
  const refreshToken = (await env.KV.get("refresh-token")) ?? env.REFRESH_TOKEN;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(env.CLIENT_ID + ":" + env.CLIENT_SECRET)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.CLIENT_ID,
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

  if (response.refresh_token) {
    await env.KV.put("refresh-token", response.refresh_token);
  }

  return response.access_token;
}

const app = new Hono<{ Bindings: Cloudflare.Env }>();

app.use(
  "*",
  cors({
    origin: "https://iwair.in",
  }),
);

app.get("/", async (c) => {
  const accessToken =
    (await c.env.KV.get("access-token")) ?? (await refreshAccessToken(c.env));

  const response = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing?market=JP",
    {
      method: "GET",
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

  // 30分ごとにAccess Tokenを更新
  async scheduled(
    _event: ScheduledEvent,
    env: Cloudflare.Env,
    _ctx: ExecutionContext,
  ) {
    const accessToken = await refreshAccessToken(env);
    await env.KV.put("access-token", accessToken);
  },
};
