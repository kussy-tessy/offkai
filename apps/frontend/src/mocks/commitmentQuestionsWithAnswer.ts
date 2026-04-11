import type { CommitmentQuestionWithAnswer } from "@offkai/core";

export const mockCommitmentQuestionsWithAnswer: CommitmentQuestionWithAnswer[] =
  [
    {
      id: "q1",
      question: "土曜日、宿に宿泊しますか？",
      deadline: "2025-10-01",
      capacity: 10,
      currentCount: 7,
      canEdit: true,
      canSelectYes: true,
      userAnswer: "yes", // 既存回答あり
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
      userAnswer: null, // 新規回答
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
      userAnswer: "no", // 既存回答あり
    },
  ];
