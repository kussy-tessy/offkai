// mocks/mockCommitmentQuestions.ts

export type CommitmentQuestionForAnswer = {
	id: string;
	question: string;
	deadline: string;
	capacity: number;
	currentCount: number;
	canSelectYes: boolean;
	canEdit: boolean;
	disableReason?: "deadlinePassed" | "capacityFull";
};

export const mockCommitmentQuestions: CommitmentQuestionForAnswer[] = [
	{
		id: "q1",
		question: "土曜日、宿に宿泊しますか？",
		deadline: "2025-10-01",
		capacity: 10,
		currentCount: 7,
		canEdit: true,
		canSelectYes: true,
	},
	{
		id: "q2",
		question: "日曜日、ロケに参加しますか？",
		deadline: "2025-09-20",
		capacity: 5,
		currentCount: 5,
		canEdit: true,
		canSelectYes: false,
		disableReason: "capacityFull",
	},
	{
		id: "q3",
		question: "前夜祭に参加しますか？",
		deadline: "2025-09-01",
		capacity: 20,
		currentCount: 12,
		canEdit: false,
		canSelectYes: false,
		disableReason: "deadlinePassed",
	},
];
