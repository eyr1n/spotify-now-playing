```sh
npx wrangler secret put SPOTIFY_CLIENT_ID
npx wrangler secret put SPOTIFY_CLIENT_SECRET
npx wrangler kv:key put --binding=SPOTIFY_NOW_PLAYING_KV "access-token" "[Access Token]"
npx wrangler kv:key put --binding=SPOTIFY_NOW_PLAYING_KV "refresh-token" "[Refresh Token]"
```
