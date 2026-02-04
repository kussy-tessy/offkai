import type { OffkaiAnswerList, Unbrand } from "@offkai/core";

export const mockOffkaiAnswerList: Unbrand<OffkaiAnswerList> = {
	offkai: {
		id: "11111111-1111-1111-1111-111111111111",
		title: "静岡オフ",
		description: "富士山周辺で遊びます",
		eventDate: "2026-02-10T00:00:00Z",
	},

	commitmentQuestions: [
		{
			id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
			label: "宿泊",
			capacity: 20,
			deadline: "2026-01-31T23:59:59Z",
		},
		{
			id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
			label: "1日目参加",
			capacity: null,
			deadline: "2026-02-09T23:59:59Z",
		},
	],

	preferenceQuestions: [
		{
			id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
			label: "交通手段はどうしますか？",
		},
		{
			id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
			label: "到着予定時刻",
		},
	],

	answers: [
		{
			user: {
				id: "u1",
				displayName: "くっしー",
			},
			commitmentAnswers: {
				"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa": "no",
				"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb": "yes",
			},
			preferenceAnswers: {
				"cccccccc-cccc-cccc-cccc-cccccccccccc": "新幹線",
				"dddddddd-dddd-dddd-dddd-dddddddddddd": "10時ごろ",
			},
		},
		{
			user: {
				id: "u2",
				displayName: "Aさん",
			},
			commitmentAnswers: {
				"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa": "yes",
				"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb": "yes",
			},
			preferenceAnswers: {
				"cccccccc-cccc-cccc-cccc-cccccccccccc": "車",
				"dddddddd-dddd-dddd-dddd-dddddddddddd": null,
			},
		},
	],
};
