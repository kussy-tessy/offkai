const DISCORD_CDN_BASE_URL = "https://cdn.discordapp.com";

export function toDiscordAvatarUrl(input: {
	discordUserId: string;
	avatarHash: string | null;
	size?: 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096;
}): string | null {
	if (!input.avatarHash) return null;

	const size = input.size ?? 64;
	const userId = encodeURIComponent(input.discordUserId);
	const avatarHash = encodeURIComponent(input.avatarHash);
	return `${DISCORD_CDN_BASE_URL}/avatars/${userId}/${avatarHash}.webp?size=${size}`;
}
