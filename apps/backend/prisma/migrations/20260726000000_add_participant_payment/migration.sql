-- CreateTable
CREATE TABLE "ParticipantPayment" (
    "answerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "collected" BOOLEAN NOT NULL DEFAULT false,
    "changeReturned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantPayment_pkey" PRIMARY KEY ("answerId")
);

-- AddForeignKey
ALTER TABLE "ParticipantPayment"
ADD CONSTRAINT "ParticipantPayment_answerId_fkey"
FOREIGN KEY ("answerId") REFERENCES "OffkaiAnswer"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
