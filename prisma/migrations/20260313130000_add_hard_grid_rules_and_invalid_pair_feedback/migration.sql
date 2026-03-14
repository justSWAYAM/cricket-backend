-- Extend Feedback for invalid hard-grid pair reporting
ALTER TABLE "Feedback"
  ALTER COLUMN "playerName" DROP NOT NULL,
  ALTER COLUMN "teamCode" DROP NOT NULL;

ALTER TABLE "Feedback"
  ADD COLUMN IF NOT EXISTS "pairType" TEXT,
  ADD COLUMN IF NOT EXISTS "criterionAType" TEXT,
  ADD COLUMN IF NOT EXISTS "criterionACode" TEXT,
  ADD COLUMN IF NOT EXISTS "criterionALabel" TEXT,
  ADD COLUMN IF NOT EXISTS "criterionBType" TEXT,
  ADD COLUMN IF NOT EXISTS "criterionBCode" TEXT,
  ADD COLUMN IF NOT EXISTS "criterionBLabel" TEXT;

-- Rules that can disable a criterion or block a pair in hard mode
CREATE TABLE IF NOT EXISTS "HardGridRule" (
  "id" TEXT PRIMARY KEY,
  "ruleType" TEXT NOT NULL,
  "pairType" TEXT,
  "criterionAType" TEXT,
  "criterionACode" TEXT,
  "criterionALabel" TEXT,
  "criterionBType" TEXT,
  "criterionBCode" TEXT,
  "criterionBLabel" TEXT,
  "criterionType" TEXT,
  "criterionCode" TEXT,
  "criterionLabel" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "sourceFeedbackId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "HardGridRule_active_idx" ON "HardGridRule"("active");
CREATE INDEX IF NOT EXISTS "HardGridRule_ruleType_idx" ON "HardGridRule"("ruleType");
CREATE INDEX IF NOT EXISTS "HardGridRule_criterionCode_idx" ON "HardGridRule"("criterionCode");
