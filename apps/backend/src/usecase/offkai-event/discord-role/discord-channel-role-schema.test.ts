import { CreateDiscordChannelRoleRequestSchema } from "@offkai/core";
import { describe, expect, it } from "vitest";

const eventId = "00000000-0000-4000-8000-000000000000";
const snowflake = "123456789012345678";

describe("CreateDiscordChannelRoleRequestSchema", () => {
	it("accepts a new category and a new role", () => {
		const result = CreateDiscordChannelRoleRequestSchema.parse({
			eventId,
			category: {
				mode: "create",
				name: "ほげオフ会",
				channelNames: ["雑談用", "連絡用"],
			},
			role: { mode: "create", name: "ほげオフ会メンバー" },
		});
		expect(result.category.mode).toBe("create");
		expect(result.role.mode).toBe("create");
	});

	it("accepts an existing category and role", () => {
		expect(() =>
			CreateDiscordChannelRoleRequestSchema.parse({
				eventId,
				category: { mode: "existing", categoryId: snowflake },
				role: { mode: "existing", roleId: snowflake },
			}),
		).not.toThrow();
	});

	it("rejects duplicate channel names", () => {
		expect(() =>
			CreateDiscordChannelRoleRequestSchema.parse({
				eventId,
				category: {
					mode: "create",
					name: "ほげオフ会",
					channelNames: ["雑談用", "雑談用"],
				},
				role: { mode: "create", name: "ほげオフ会メンバー" },
			}),
		).toThrow();
	});
});
