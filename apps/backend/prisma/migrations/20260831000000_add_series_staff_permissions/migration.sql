ALTER TABLE "Series"
ADD COLUMN "staffPermissions" JSONB NOT NULL DEFAULT '{"showUnansweredEvents":true,"allowApplicationBeforeStart":false,"eventManagement":false,"answerManagement":"read","discordRole":"manage","feeCalculation":"confirm","feeCollection":"record","settlement":"confirm","refund":"record"}';
