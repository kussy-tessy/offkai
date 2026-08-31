import { describe, expect, it } from "vitest";
import { toDiscordAvatarUrl } from "./discord-avatar-url";

describe("toDiscordAvatarUrl", () => {
	it("builds a Discord CDN URL", () => {
		expect(
			toDiscordAvatarUrl({
				discordUserId: "123456789012345678",
				avatarHash: "avatar-hash",
			}),
		).toBe(
			"https://cdn.discordapp.com/avatars/123456789012345678/avatar-hash.webp?size=64",
		);
	});

	it("keeps animated avatar hashes while requesting a static image", () => {
		expect(
			toDiscordAvatarUrl({
				discordUserId: "123456789012345678",
				avatarHash: "a_animated-hash",
				size: 128,
			}),
		).toBe(
			"https://cdn.discordapp.com/avatars/123456789012345678/a_animated-hash.webp?size=128",
		);
	});

	it("returns null when the user has no custom avatar", () => {
		expect(
			toDiscordAvatarUrl({
				discordUserId: "123456789012345678",
				avatarHash: null,
			}),
		).toBeNull();
	});
});
