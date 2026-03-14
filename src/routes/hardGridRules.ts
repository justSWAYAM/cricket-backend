import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { randomUUID } from "crypto";

const router = Router();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function requireAdmin(req: Request, res: Response): boolean {
  const authHeader = req.headers.authorization;
  if (authHeader !== "Bearer admin-authenticated") {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function pairKey(aType: string, aCode: string, bType: string, bCode: string): string {
  const left = `${aType}:${aCode}`;
  const right = `${bType}:${bCode}`;
  return left < right ? `${left}|${right}` : `${right}|${left}`;
}

router.get("/hard-grid/rules", async (_req: Request, res: Response) => {
  try {
    const rules = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "HardGridRule" WHERE "active" = true ORDER BY "createdAt" DESC`
    );

    const disabledCriteria = rules
      .filter((r) => r.ruleType === "criterion" && r.criterionType && r.criterionCode)
      .map((r) => ({
        id: r.id,
        criterionType: r.criterionType,
        criterionCode: r.criterionCode,
        criterionLabel: r.criterionLabel,
      }));

    const blockedPairs = rules
      .filter((r) => r.ruleType === "pair" && r.criterionAType && r.criterionACode && r.criterionBType && r.criterionBCode)
      .map((r) => ({
        id: r.id,
        pairType: r.pairType,
        criterionAType: r.criterionAType,
        criterionACode: r.criterionACode,
        criterionALabel: r.criterionALabel,
        criterionBType: r.criterionBType,
        criterionBCode: r.criterionBCode,
        criterionBLabel: r.criterionBLabel,
        key: pairKey(r.criterionAType!, r.criterionACode!, r.criterionBType!, r.criterionBCode!),
      }));

    res.json({ disabledCriteria, blockedPairs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load hard-grid rules" });
  }
});

router.get("/admin/hard-grid/rules", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  try {
    const rules = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "HardGridRule" ORDER BY "createdAt" DESC`
    );
    res.json(rules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load admin hard-grid rules" });
  }
});

router.post("/admin/hard-grid/block-pair", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  try {
    const {
      pairType,
      criterionAType,
      criterionACode,
      criterionALabel,
      criterionBType,
      criterionBCode,
      criterionBLabel,
      note,
      sourceFeedbackId,
    } = req.body;

    if (!pairType || !criterionAType || !criterionACode || !criterionBType || !criterionBCode) {
      return res.status(400).json({ error: "Pair type and both criteria are required" });
    }

    const existing = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT *
      FROM "HardGridRule"
      WHERE "active" = true
        AND "ruleType" = 'pair'
        AND (
          ("criterionAType" = $1 AND "criterionACode" = $2 AND "criterionBType" = $3 AND "criterionBCode" = $4)
          OR
          ("criterionAType" = $3 AND "criterionACode" = $4 AND "criterionBType" = $1 AND "criterionBCode" = $2)
        )
      LIMIT 1
      `,
      criterionAType,
      criterionACode,
      criterionBType,
      criterionBCode
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "This pair is already blocked" });
    }

    const id = randomUUID();
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "HardGridRule" (
        "id", "ruleType", "pairType", "criterionAType", "criterionACode", "criterionALabel",
        "criterionBType", "criterionBCode", "criterionBLabel", "note", "sourceFeedbackId", "active"
      ) VALUES ($1, 'pair', $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      `,
      id,
      pairType,
      criterionAType,
      criterionACode,
      criterionALabel || criterionACode,
      criterionBType,
      criterionBCode,
      criterionBLabel || criterionBCode,
      note || null,
      sourceFeedbackId || null
    );

    const [rule] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "HardGridRule" WHERE "id" = $1 LIMIT 1`,
      id
    );

    if (sourceFeedbackId) {
      await prisma.feedback.update({
        where: { id: sourceFeedbackId },
        data: { status: "added" },
      });
    }

    res.json(rule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to block pair" });
  }
});

router.post("/admin/hard-grid/block-criterion", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { criterionType, criterionCode, criterionLabel, note, sourceFeedbackId } = req.body;

    if (!criterionType || !criterionCode) {
      return res.status(400).json({ error: "Criterion type and code are required" });
    }

    const existing = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT *
      FROM "HardGridRule"
      WHERE "active" = true
        AND "ruleType" = 'criterion'
        AND "criterionType" = $1
        AND "criterionCode" = $2
      LIMIT 1
      `,
      criterionType,
      criterionCode
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "This criterion is already disabled" });
    }

    const id = randomUUID();
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "HardGridRule" (
        "id", "ruleType", "criterionType", "criterionCode", "criterionLabel", "note", "sourceFeedbackId", "active"
      ) VALUES ($1, 'criterion', $2, $3, $4, $5, $6, true)
      `,
      id,
      criterionType,
      criterionCode,
      criterionLabel || criterionCode,
      note || null,
      sourceFeedbackId || null
    );

    const [rule] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "HardGridRule" WHERE "id" = $1 LIMIT 1`,
      id
    );

    if (sourceFeedbackId) {
      await prisma.feedback.update({
        where: { id: sourceFeedbackId },
        data: { status: "added" },
      });
    }

    res.json(rule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to disable criterion" });
  }
});

router.patch("/admin/hard-grid/rules/:id/toggle", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "active must be boolean" });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "HardGridRule" SET "active" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $2`,
      active,
      id
    );

    const [rule] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "HardGridRule" WHERE "id" = $1 LIMIT 1`,
      id
    );

    res.json(rule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle rule" });
  }
});

export default router;
