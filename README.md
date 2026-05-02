# spotify-now-playing

## Refresh Token の発行

`.env` を作成する．REFRESH_TOKEN は空欄でいい．

```
CLIENT_ID=Client IDを記載
CLIENT_SECRET=Client Secretを記載
REFRESH_TOKEN=
```

`pnpm run auth` を実行後表示されたURLにアクセスし，Refresh Token を `.env` に追記する．

## デプロイ

```sh
pnpm run deploy
```
