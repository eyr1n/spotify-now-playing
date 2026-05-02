import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { env } from "hono/adapter";
import { AuthorizeResponse, TokenResponse } from "./schemas.js";

interface Env {
  Bindings: {
    CLIENT_ID: never;
    CLIENT_SECRET: string;
    REFRESH_TOKEN: string;
  };
}

const app = new Hono<Env>();

app.get("/", zValidator("query", AuthorizeResponse), async (c) => {
  const url = new URL(c.req.url);

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(env(c).CLIENT_ID + ":" + env(c).CLIENT_SECRET)}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: c.req.valid("query").code,
      redirect_uri: `http://127.0.0.1:${url.port}`,
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

  console.log(`REFRESH_TOKEN: ${res.refresh_token}`);

  return c.text("success");
});

serve(app, (info) => {
  console.log(
    `https://accounts.spotify.com/authorize?${new URLSearchParams({
      response_type: "code",
      client_id: process.env.CLIENT_ID as string,
      scope: "user-read-currently-playing",
      redirect_uri: `http://127.0.0.1:${info.port}`,
    })}`,
  );
});
