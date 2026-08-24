import { v7 as uuidv7 } from "uuid";
import type {
	OffkaiEventId,
	PaymentAmount,
	QuestionId,
	SettlementCategoryId,
	UserId,
} from "../../schema";
import { SettlementCategoryIdSchema } from "../../schema";
import { MoneyAmount } from "./money-amount";
export type SettlementCategoryMember = {
	userId: UserId;
	amountOverride: PaymentAmount | null;
};

export class SettlementCategory {
	private constructor(
		readonly id: SettlementCategoryId,
		readonly eventId: OffkaiEventId,
		readonly name: string,
		readonly baseParticipationFeeAmount: PaymentAmount,
		readonly commitmentQuestionId: QuestionId | null,
		readonly members: SettlementCategoryMember[],
	) {}

	static create(params: {
		eventId: OffkaiEventId;
		name: string;
		baseParticipationFeeAmount: number;
		commitmentQuestionId: QuestionId | null;
	}): SettlementCategory {
		return new SettlementCategory(
			SettlementCategoryIdSchema.parse(uuidv7()),
			params.eventId,
			SettlementCategory.normalizeName(params.name),
			MoneyAmount.from(params.baseParticipationFeeAmount).value,
			params.commitmentQuestionId,
			[],
		);
	}

	static reconstruct(params: {
		id: SettlementCategoryId;
		eventId: OffkaiEventId;
		name: string;
		baseParticipationFeeAmount: number;
		commitmentQuestionId: QuestionId | null;
		members: SettlementCategoryMember[];
	}): SettlementCategory {
		SettlementCategory.assertUniqueMembers(params.members);
		return new SettlementCategory(
			params.id,
			params.eventId,
			SettlementCategory.normalizeName(params.name),
			MoneyAmount.from(params.baseParticipationFeeAmount).value,
			params.commitmentQuestionId,
			params.members.map((member) => ({
				...member,
				amountOverride:
					member.amountOverride === null
						? null
						: MoneyAmount.from(member.amountOverride).value,
			})),
		);
	}

	edit(params: {
		name: string;
		baseParticipationFeeAmount: number;
		commitmentQuestionId: QuestionId | null;
	}): SettlementCategory {
		return SettlementCategory.reconstruct({ ...this, ...params });
	}

	setMember(userId: UserId, amountOverride: number | null): SettlementCategory {
		const member = {
			userId,
			amountOverride:
				amountOverride === null ? null : MoneyAmount.from(amountOverride).value,
		};
		return SettlementCategory.reconstruct({
			...this,
			members: [
				...this.members.filter((item) => item.userId !== userId),
				member,
			],
		});
	}

	removeMember(userId: UserId): SettlementCategory {
		return SettlementCategory.reconstruct({
			...this,
			members: this.members.filter((member) => member.userId !== userId),
		});
	}

	syncMembers(userIds: UserId[]): {
		category: SettlementCategory;
		addedCount: number;
		removedCount: number;
		resetOverrideCount: number;
	} {
		const uniqueUserIds = [...new Set(userIds)];
		const currentIds = new Set(this.members.map((member) => member.userId));
		const nextIds = new Set(uniqueUserIds);
		return {
			category: SettlementCategory.reconstruct({
				...this,
				members: uniqueUserIds.map((userId) => ({
					userId,
					amountOverride: null,
				})),
			}),
			addedCount: uniqueUserIds.filter((id) => !currentIds.has(id)).length,
			removedCount: this.members.filter((member) => !nextIds.has(member.userId))
				.length,
			resetOverrideCount: this.members.filter(
				(member) =>
					nextIds.has(member.userId) && member.amountOverride !== null,
			).length,
		};
	}

	amountFor(userId: UserId): PaymentAmount | null {
		const member = this.members.find((item) => item.userId === userId);
		if (!member) return null;
		return member.amountOverride ?? this.baseParticipationFeeAmount;
	}

	private static normalizeName(name: string): string {
		const normalized = name.trim();
		if (normalized.length === 0)
			throw new Error("精算区分名を入力してください。");
		return normalized;
	}

	private static assertUniqueMembers(members: SettlementCategoryMember[]) {
		if (
			new Set(members.map((member) => member.userId)).size !== members.length
		) {
			throw new Error("同じ参加者を精算区分に重複して登録できません。");
		}
	}
}
