import { User } from "@offkai/core";
import { describe, expect, it } from "vitest";

describe("User authentication methods", () => {
	it("creates a Discord-only user and lets it add a password credential", () => {
		const discordUser = User.createWithDiscord({
			name: "表示名",
			discordUsername: "discord_user",
			discordUserId: "123456789012345678",
		});

		expect(discordUser.loginId).toBeNull();
		expect(discordUser.passwordHash).toBeNull();

		const user = discordUser.setPasswordCredential("login_id", "hashed-password");
		expect(user.loginId).toBe("login_id");
		expect(user.passwordHash).toBe("hashed-password");
		expect(user.discordUserId).toBe("123456789012345678");
	});

	it("does not allow removing the last authentication method", () => {
		const user = User.createWithDiscord({
			name: "表示名",
			discordUsername: "discord_user",
			discordUserId: "123456789012345678",
		});

		expect(() => user.disconnectDiscord()).toThrow("最後のログイン手段");
	});

	it("allows Discord removal after a password credential is added", () => {
		const user = User.createWithDiscord({
			name: "表示名",
			discordUsername: "discord_user",
			discordUserId: "123456789012345678",
		})
			.setPasswordCredential("login_id", "hashed-password")
			.disconnectDiscord();

		expect(user.discordUserId).toBeNull();
		expect(user.loginId).toBe("login_id");
	});
});
