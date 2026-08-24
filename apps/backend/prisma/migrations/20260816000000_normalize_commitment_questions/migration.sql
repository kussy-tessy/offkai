-- CreateTable
CREATE TABLE "CommitmentQuestion" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "questionShort" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommitmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommitmentAnswer" (
    "answerId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" BOOLEAN,

    CONSTRAINT "CommitmentAnswer_pkey" PRIMARY KEY ("answerId", "questionId")
);

-- Migrate the current question definitions while preserving their IDs and order.
INSERT INTO "CommitmentQuestion" (
    "id", "eventId", "question", "questionShort", "deadline",
    "description", "capacity", "required", "sortOrder", "createdAt", "updatedAt"
)
SELECT
    question.value->>'id',
    event."id",
    question.value->>'question',
    question.value->>'questionShort',
    (question.value->>'deadline')::TIMESTAMP(3),
    COALESCE(question.value->>'description', ''),
    (question.value->>'capacity')::INTEGER,
    COALESCE((question.value->>'required')::BOOLEAN, false),
    question.ordinality::INTEGER - 1,
    event."createdAt",
    event."updatedAt"
FROM "OffkaiEvent" AS event
CROSS JOIN LATERAL jsonb_array_elements(event."commitmentQuestions")
    WITH ORDINALITY AS question(value, ordinality);

-- Create one row for every current question and participant answer. Missing answers
-- become NULL; answers to questions no longer present on the event are intentionally
-- excluded because they are not part of the current answer state.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "OffkaiAnswer" AS answer
        CROSS JOIN LATERAL jsonb_array_elements(answer."commitmentAnswers") AS item(value)
        WHERE item.value->'answer' IS NOT NULL
          AND item.value->>'answer' NOT IN ('yes', 'no')
    ) THEN
        RAISE EXCEPTION 'Invalid commitment answer value found during normalization';
    END IF;
END $$;

INSERT INTO "CommitmentAnswer" ("answerId", "questionId", "answer")
SELECT
    answer."id",
    question."id",
    CASE answer_item.value->>'answer'
        WHEN 'yes' THEN true
        WHEN 'no' THEN false
        ELSE NULL
    END
FROM "OffkaiAnswer" AS answer
JOIN "CommitmentQuestion" AS question
    ON question."eventId" = answer."eventId"
LEFT JOIN LATERAL (
    SELECT item.value
    FROM jsonb_array_elements(answer."commitmentAnswers") AS item(value)
    WHERE item.value->>'questionId' = question."id"
) AS answer_item ON true;

-- CreateIndex
CREATE INDEX "CommitmentQuestion_eventId_archivedAt_sortOrder_idx"
    ON "CommitmentQuestion"("eventId", "archivedAt", "sortOrder");

-- CreateIndex
CREATE INDEX "CommitmentAnswer_questionId_answer_idx"
    ON "CommitmentAnswer"("questionId", "answer");

-- AddForeignKey
ALTER TABLE "CommitmentQuestion"
    ADD CONSTRAINT "CommitmentQuestion_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "OffkaiEvent"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitmentAnswer"
    ADD CONSTRAINT "CommitmentAnswer_answerId_fkey"
    FOREIGN KEY ("answerId") REFERENCES "OffkaiAnswer"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitmentAnswer"
    ADD CONSTRAINT "CommitmentAnswer_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "CommitmentQuestion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop the JSON columns only after the normalized data has been populated.
ALTER TABLE "OffkaiEvent" DROP COLUMN "commitmentQuestions";
ALTER TABLE "OffkaiAnswer" DROP COLUMN "commitmentAnswers";
