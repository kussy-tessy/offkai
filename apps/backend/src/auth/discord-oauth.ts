import { DiscordUsernameSchema, DiscordUserIdSchema } from "@offkai/core";
import { AppError } from "../app-error";

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";

type DiscordOAuthConfig = {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
};

export type DiscordOAuthUser = {
	id: string;
	username: string;
	displayName: string;
	avatarHash: string | null;
};

export function getDiscordAuthorizationUrl(state: string): string {
	const config = getDiscordOAuthConfig();
	const url = new URL("https://discord.com/oauth2/authorize");
	url.searchParams.set("client_id", config.clientId);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("redirect_uri", config.redirectUri);
	url.searchParams.set("scope", "identify");
	url.searchParams.set("state", state);
	return url.toString();
}

export async function getDiscordUserFromCode(
	code: string,
): Promise<DiscordOAuthUser> {
	const config = getDiscordOAuthConfig();
	const tokenResponse = await fetch(`${DISCORD_API_BASE_URL}/oauth2/token`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: config.clientId,
			client_secret: config.clientSecret,
			grant_type: "authorization_code",
			code,
			redirect_uri: config.redirectUri,
		}),
	});

	if (!tokenResponse.ok) {
		throw new AppError(
			"VALIDATION_ERROR",
			"Discordの認可コードを確認できませんでした。",
		);
	}

	const tokenBody = (await tokenResponse.json()) as {
		access_token?: unknown;
		token_type?: unknown;
	};
	if (
		typeof tokenBody.access_token !== "string" ||
		tokenBody.token_type !== "Bearer"
	) {
		throw new AppError(
			"VALIDATION_ERROR",
			"Discordから不正なトークン応答を受け取りました。",
		);
	}

	const userResponse = await fetch(`${DISCORD_API_BASE_URL}/users/@me`, {
		headers: { Authorization: `Bearer ${tokenBody.access_token}` },
	});
	if (!userResponse.ok) {
		throw new AppError(
			"VALIDATION_ERROR",
			"Discordユーザー情報を取得できませんでした。",
		);
	}

	const userBody = (await userResponse.json()) as {
		id?: unknown;
		username?: unknown;
		global_name?: unknown;
		avatar?: unknown;
	};
	const id = DiscordUserIdSchema.safeParse(userBody.id);
	const username = DiscordUsernameSchema.safeParse(userBody.username);
	if (!id.success || !username.success) {
		throw new AppError(
			"VALIDATION_ERROR",
			"Discordから不正なユーザー情報を受け取りました。",
		);
	}

	const displayName =
		typeof userBody.global_name === "string" && userBody.global_name.trim()
			? userBody.global_name.trim()
			: username.data;
	return {
		id: id.data,
		username: username.data,
		displayName,
		avatarHash: typeof userBody.avatar === "string" ? userBody.avatar : null,
	};
}

export function getDiscordOAuthFrontendUrl(): string {
	const configured = process.env.FRONTEND_URL?.trim();
	if (configured) return configured.replace(/\/$/, "");
	return process.env.NODE_ENV === "production"
		? "https://off.kg-misskey.net"
		: "http://localhost:5173";
}

function getDiscordOAuthConfig(): DiscordOAuthConfig {
	const clientId = process.env.DISCORD_CLIENT_ID?.trim();
	const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim();
	const redirectUri = process.env.DISCORD_REDIRECT_URI?.trim();

	if (!clientId || !clientSecret || !redirectUri) {
		throw new Error(
			"DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET and DISCORD_REDIRECT_URI must be set.",
		);
	}

	return { clientId, clientSecret, redirectUri };
}
