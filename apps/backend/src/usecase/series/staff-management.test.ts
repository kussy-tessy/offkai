import {
	DiscordUsernameSchema,
	UserIdSchema,
	UserNameSchema,
} from "@offkai/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	findDiscordGuildIdByOwner: vi.fn(),
	findByDiscordUserId: vi.fn(),
	addStaffByOwner: vi.fn(),
	getUserIdByUsername: vi.fn(),
}));

vi.mock("../../discord", () => ({
	discordService: { getUserIdByUsername: mocks.getUserIdByUsername },
}));

vi.mock("../../repository", () => ({
	SeriesRepository: class {
		findDiscordGuildIdByOwner = mocks.findDiscordGuildIdByOwner;
		addStaffByOwner = mocks.addStaffByOwner;
	},
	UserRepository: class {
		findByDiscordUserId = mocks.findByDiscordUserId;
	},
}));

import { addSeriesStaff } from "./staff-management.usecase";

const ownerUserId = UserIdSchema.parse("019c0000-0000-7000-8000-000000000001");
const staffUserId = UserIdSchema.parse("019c0000-0000-7000-8000-000000000002");
const discordUsername = DiscordUsernameSchema.parse("staff_user");

describe("シリーズスタッフ追加", () => {
	beforeEach(() => vi.clearAllMocks());

	it("ギルド所属者をDiscordユーザーIDでKigPlaユーザーと照合して追加する", async () => {
		mocks.findDiscordGuildIdByOwner.mockResolvedValue("123456789012345678");
		mocks.getUserIdByUsername.mockResolvedValue("234567890123456789");
		mocks.findByDiscordUserId.mockResolvedValue({ id: staffUserId });
		mocks.addStaffByOwner.mockResolvedValue({
			userId: staffUserId,
			userName: UserNameSchema.parse("スタッフ"),
			discordUsername,
			discordAvatarUrl: null,
		});

		await expect(
			addSeriesStaff({ discordUsername }, ownerUserId),
		).resolves.toMatchObject({ userId: staffUserId, discordUsername });
		expect(mocks.getUserIdByUsername).toHaveBeenCalledWith({
			guildId: "123456789012345678",
			username: discordUsername,
		});
		expect(mocks.addStaffByOwner).toHaveBeenCalledWith(
			ownerUserId,
			staffUserId,
		);
	});

	it.each([
		["ギルドに所属していない", null, null],
		["KigPlaに登録されていない", "234567890123456789", null],
	])("%s場合は同じ見つからないエラーにする", async (_label, discordUserId, user) => {
		mocks.findDiscordGuildIdByOwner.mockResolvedValue("123456789012345678");
		mocks.getUserIdByUsername.mockResolvedValue(discordUserId);
		mocks.findByDiscordUserId.mockResolvedValue(user);

		await expect(
			addSeriesStaff({ discordUsername }, ownerUserId),
		).rejects.toThrow("ユーザーが見つかりません。");
		expect(mocks.addStaffByOwner).not.toHaveBeenCalled();
	});

	it("Discordサーバー未設定時は設定を促す", async () => {
		mocks.findDiscordGuildIdByOwner.mockResolvedValue(null);

		await expect(
			addSeriesStaff({ discordUsername }, ownerUserId),
		).rejects.toThrow("先にDiscordサーバーIDを設定してください。");
		expect(mocks.getUserIdByUsername).not.toHaveBeenCalled();
	});
});
