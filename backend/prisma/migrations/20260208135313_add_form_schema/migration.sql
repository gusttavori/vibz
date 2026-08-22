-- AlterTable
ALTER TABLE "events" ADD COLUMN     "formSchema" JSONB;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "participantData" JSONB;
