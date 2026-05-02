# spotify-now-playing

## 初回の Access Token, Refresh Token の発行

`.env` を作成する．

```
CLIENT_ID=Client IDを記載
CLIENT_SECRET=Client Secretを記載
REFRESH_TOKEN=
```

`pnpm run dev` を実行後 http://localhost:8787 にアクセスし，Access Token と Refresh Token を取得する．

## デプロイ

Cloudflare KV の名前空間を作成する．

```sh
npx wrangler kv namespace create KV
```

`wrangler.toml` に `binding` と `id` を記載後，以下のコマンドでデプロイする．

```sh
npx wrangler secret put CLIENT_ID
npx wrangler secret put CLIENT_SECRET
npx wrangler kv key put --binding=KV --remote "access-token" "Access Tokenを記載"
npx wrangler kv key put --binding=KV --remote "refresh-token" "Refresh Tokenを記載"
npm run deploy
```
