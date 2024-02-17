interface Env {
	SPOTIFY_CLIENT_ID: string;
	SPOTIFY_CLIENT_SECRET: string;
	SPOTIFY_REDIRECT_URL?: string;
	SPOTIFY_NOW_PLAYING_KV: KVNamespace;
}

interface SpotifyCurrentlyPlaying {
	progress_ms?: number | null;
	is_playing?: boolean;
	item?: {
		album?: {
			external_urls: {
				spotify?: string;
			};
			images: {
				url: string;
				height: number | null;
				width: number | null;
			}[];
			name: string;
		};
		artists?: {
			external_urls?: {
				spotify?: string;
			};
			name?: string;
		}[];
		duration_ms?: number;
		external_urls?: {
			spotify?: string;
		};
		name?: string;
	} | null;
	currently_playing_type?: 'track' | 'episode' | 'ad' | 'unknown';
}

interface WorkerCurrentlyPlaying {
	album: {
		name?: string;
		url?: string;
	};
	artists: {
		name?: string;
		url?: string;
	}[];
	duration_ms?: number;
	images: {
		url: string;
		height: number | null;
		width: number | null;
	}[];
	is_playing?: boolean;
	name?: string;
	progress_ms?: number | null;
	url?: string;
}

export default {
	// Access Tokenを使用して再生中の音楽を取得
	async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
		if (env.SPOTIFY_REDIRECT_URL) {
			const code = new URL(request.url).searchParams.get('code');
			if (!code) {
				return Response.redirect(
					`https://accounts.spotify.com/authorize?${new URLSearchParams({
						response_type: 'code',
						client_id: env.SPOTIFY_CLIENT_ID,
						scope: 'user-read-currently-playing',
						redirect_uri: env.SPOTIFY_REDIRECT_URL,
					})}`,
					302
				);
			}

			const response: { access_token: string; refresh_token: string } = await fetch('https://accounts.spotify.com/api/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Basic ${btoa(env.SPOTIFY_CLIENT_ID + ':' + env.SPOTIFY_CLIENT_SECRET)}`,
				},
				body: new URLSearchParams({
					grant_type: 'authorization_code',
					code: code,
					redirect_uri: env.SPOTIFY_REDIRECT_URL,
				}),
			}).then((res) => {
				if (res.status !== 200) {
					throw new Error('Spotify API Error');
				}
				return res.json();
			});

			await env.SPOTIFY_NOW_PLAYING_KV.put('access-token', response.access_token);
			await env.SPOTIFY_NOW_PLAYING_KV.put('refresh-token', response.refresh_token);

			return Response.json({
				access_token: response.access_token,
				refresh_token: response.refresh_token,
			});
		}

		const accessToken = await env.SPOTIFY_NOW_PLAYING_KV.get('access-token');
		if (!accessToken) {
			throw new Error('access-token is null');
		}

		const spotifyResponse: SpotifyCurrentlyPlaying = await fetch('https://api.spotify.com/v1/me/player/currently-playing?market=JP', {
			method: 'GET',
			headers: { Authorization: `Bearer ${accessToken}` },
		}).then((res) => {
			if (res.status === 204) {
				return {};
			}
			if (res.status !== 200) {
				throw new Error('Spotify API Error');
			}
			return res.json();
		});

		const workerResponse: WorkerCurrentlyPlaying = {
			album: { name: spotifyResponse.item?.album?.name, url: spotifyResponse?.item?.album?.external_urls.spotify },
			artists: spotifyResponse.item?.artists?.map((artist) => ({ name: artist.name, url: artist.external_urls?.spotify })) ?? [],
			duration_ms: spotifyResponse.item?.duration_ms,
			images: spotifyResponse.item?.album?.images.map((image) => ({ url: image.url, height: image.height, width: image.width })) ?? [],
			is_playing: spotifyResponse.is_playing,
			name: spotifyResponse.item?.name,
			progress_ms: spotifyResponse.progress_ms,
			url: spotifyResponse.item?.external_urls?.spotify,
		};
		return Response.json(workerResponse);
	},

	// 30分ごとにAccess Tokenを更新
	async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
		const refreshToken = await env.SPOTIFY_NOW_PLAYING_KV.get('refresh-token');
		if (!refreshToken) {
			throw new Error('refresh-token is null');
		}

		const response: { access_token: string; refresh_token?: string } = await fetch('https://accounts.spotify.com/api/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${btoa(env.SPOTIFY_CLIENT_ID + ':' + env.SPOTIFY_CLIENT_SECRET)}`,
			},
			body: new URLSearchParams({
				grant_type: 'refresh_token',
				refresh_token: refreshToken,
				client_id: env.SPOTIFY_CLIENT_ID,
			}),
		}).then((res) => {
			if (res.status !== 200) {
				throw new Error('Spotify API Error');
			}
			return res.json();
		});

		await env.SPOTIFY_NOW_PLAYING_KV.put('access-token', response.access_token);
		if (response.refresh_token) {
			await env.SPOTIFY_NOW_PLAYING_KV.put('refresh-token', response.refresh_token);
		}
	},
};
