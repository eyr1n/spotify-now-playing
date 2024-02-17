interface Env {
	CLIENT_ID: string;
	CLIENT_SECRET: string;
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
	// AccessTokenを使用してNowPlayingを取得
	async fetch(_request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
		const accessToken = await env.SPOTIFY_NOW_PLAYING_KV.get('access-token').then((token) => {
			if (!token) {
				throw new Error('access-token is null');
			}
			return token;
		});

		const spotifyResponse: SpotifyCurrentlyPlaying = await fetch('https://api.spotify.com/v1/me/player/currently-playing?market=JP', {
			method: 'GET',
			headers: { Authorization: `Bearer ${accessToken}` },
		}).then(async (res) => {
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

	// 30分ごとにAccessTokenを更新
	async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
		const refreshToken = await env.SPOTIFY_NOW_PLAYING_KV.get('refresh-token').then((token) => {
			if (!token) {
				throw new Error('refresh-token is null');
			}
			return token;
		});

		const res: { access_token: string; refresh_token?: string } = await fetch('https://accounts.spotify.com/api/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${btoa(env.CLIENT_ID + ':' + env.CLIENT_SECRET)}`,
			},
			body: new URLSearchParams({
				grant_type: 'refresh_token',
				refresh_token: refreshToken,
				client_id: env.CLIENT_ID,
			}),
		}).then((res) => {
			if (res.status !== 200) {
				throw new Error('Spotify API Error');
			}
			return res.json();
		});

		await env.SPOTIFY_NOW_PLAYING_KV.put('access-token', res.access_token);
		if (res.refresh_token) {
			await env.SPOTIFY_NOW_PLAYING_KV.put('refresh-token', res.refresh_token);
		}
	},
};
