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

// DD and DC are the same franchise (Delhi Daredevils rebranded to Delhi Capitals)
const EQUIVALENT_TEAMS = {
  "DD": ["DD", "DC"],
  "DC": ["DD", "DC"],
};

// POST /api/hints
// Get possible answers for specific criteria
router.post("/", async (req: Request, res: Response) => {
  try {
    const { rowCriterion, colCriterion } = req.body;

    if (!rowCriterion || !colCriterion) {
      return res.status(400).json({ error: "Both criteria are required" });
    }

    // Fetch all players
    const players = await prisma.player.findMany({
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

    // Filter players that match both criteria
    const matchingPlayers = players.filter(player => {
      const teamCodes = player.iplTeams.map(t => t.team.code);
      
      // Check row criterion
      let rowMatch = false;
      if (rowCriterion.type === "team") {
        const teamCodesToCheck = EQUIVALENT_TEAMS[rowCriterion.code] || [rowCriterion.code];
        rowMatch = teamCodesToCheck.some(code => teamCodes.includes(code));
      } else if (rowCriterion.type === "nationality") {
        rowMatch = player.nationality === rowCriterion.code;
      }

      // Check column criterion
      let colMatch = false;
      if (colCriterion.type === "team") {
        const teamCodesToCheck = EQUIVALENT_TEAMS[colCriterion.code] || [colCriterion.code];
        colMatch = teamCodesToCheck.some(code => teamCodes.includes(code));
      } else if (colCriterion.type === "nationality") {
        colMatch = player.nationality === colCriterion.code;
      }

      return rowMatch && colMatch;
    });

    // Shuffle and pick up to 3-5 random players
    const shuffled = matchingPlayers.sort(() => Math.random() - 0.5);
    const hints = shuffled.slice(0, Math.min(5, shuffled.length)).map(p => ({
      id: p.id,
      name: p.name,
      nationality: p.nationality,
      teams: p.iplTeams.map(t => t.team.code),
    }));

    res.json({ hints, totalCount: matchingPlayers.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch hints" });
  }
});

export default router;
