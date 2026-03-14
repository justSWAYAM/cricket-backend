import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const router = Router();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// POST /api/feedback
// Submit feedback about missing player-team combinations
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      type,
      playerId,
      playerName,
      teamCode,
      pairType,
      criterionAType,
      criterionACode,
      criterionALabel,
      criterionBType,
      criterionBCode,
      criterionBLabel,
      note,
    } = req.body;

    // Validate type
    if (type && !["report", "add", "invalid_pair"].includes(type)) {
      return res.status(400).json({ error: "Invalid feedback type" });
    }

    if ((type || "report") === "invalid_pair") {
      if (!pairType || !criterionAType || !criterionACode || !criterionBType || !criterionBCode) {
        return res.status(400).json({ error: "Pair type and both criteria are required" });
      }

      if (!["team_metric", "metric_metric"].includes(pairType)) {
        return res.status(400).json({ error: "Invalid pair type" });
      }

      const feedback = await prisma.feedback.create({
        data: {
          type: "invalid_pair",
          pairType,
          criterionAType,
          criterionACode,
          criterionALabel: criterionALabel || criterionACode,
          criterionBType,
          criterionBCode,
          criterionBLabel: criterionBLabel || criterionBCode,
          note: note || null,
        },
      });

      return res.json({ success: true, id: feedback.id });
    }

    if (!playerName || !teamCode) {
      return res.status(400).json({ error: "Player name and team code are required" });
    }

    // If type is "add", verify the player exists and doesn't already have this team
    if (type === "add" && playerId) {
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: {
          iplTeams: {
            include: {
              team: {
                select: { code: true },
              },
            },
          },
        },
      });

      if (!player) {
        return res.status(400).json({ error: "Player not found" });
      }

      // Check if player already has this team
      const hasTeam = player.iplTeams.some((t) => t.team.code === teamCode);
      if (hasTeam) {
        return res.status(400).json({ error: "Player already linked with this team" });
      }
    }

    const feedback = await prisma.feedback.create({
      data: {
        type: type || "report",
        playerId: playerId || null,
        playerName,
        teamCode,
        note: note || null,
      },
    });

    res.json({ success: true, id: feedback.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

export default router;
