```sh
npx wrangler kv:namespace create KV
npx wrangler secret put CLIENT_ID
npx wrangler secret put CLIENT_SECRET
npx wrangler kv:key put --binding=KV "access-token" "[Access Token]"
npx wrangler kv:key put --binding=KV "refresh-token" "[Refresh Token]"
```
