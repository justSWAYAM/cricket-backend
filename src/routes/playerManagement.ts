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

// Middleware to check admin auth
const requireAuth = (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== "Bearer admin-authenticated") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// POST /api/player-management/add-player
// Add a completely new player to the database
router.post("/add-player", requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, nationality, teamCodes } = req.body;

    if (!name || !nationality) {
      return res.status(400).json({ error: "Name and nationality are required" });
    }

    // Check if player already exists
    const existing = await prisma.player.findUnique({
      where: { name },
    });

    if (existing) {
      return res.status(400).json({ error: "Player with this name already exists" });
    }

    // Create player
    const player = await prisma.player.create({
      data: {
        name,
        nationality,
      },
    });

    // Add team links if provided
    if (teamCodes && Array.isArray(teamCodes) && teamCodes.length > 0) {
      for (const teamCode of teamCodes) {
        const team = await prisma.iPLTeam.findUnique({
          where: { code: teamCode },
        });

        if (team) {
          await prisma.playerIPLTeam.create({
            data: {
              playerId: player.id,
              teamId: team.id,
            },
          });
        }
      }
    }

    res.json({ success: true, player });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add player" });
  }
});

// POST /api/player-management/add-team-link
// Add a team link to an existing player
router.post("/add-team-link", requireAuth, async (req: Request, res: Response) => {
  try {
    const { playerId, teamCode } = req.body;

    if (!playerId || !teamCode) {
      return res.status(400).json({ error: "Player ID and team code are required" });
    }

    // Verify player exists
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
      return res.status(404).json({ error: "Player not found" });
    }

    // Check if link already exists
    const hasTeam = player.iplTeams.some((t) => t.team.code === teamCode);
    if (hasTeam) {
      return res.status(400).json({ error: "Player already linked with this team" });
    }

    // Find team
    const team = await prisma.iPLTeam.findUnique({
      where: { code: teamCode },
    });

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Create link
    await prisma.playerIPLTeam.create({
      data: {
        playerId: player.id,
        teamId: team.id,
      },
    });

    res.json({ success: true, message: "Team link added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add team link" });
  }
});

// GET /api/player-management/teams
// Get all available teams
router.get("/teams", requireAuth, async (req: Request, res: Response) => {
  try {
    const teams = await prisma.iPLTeam.findMany({
      orderBy: { code: "asc" },
    });

    res.json(teams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

export default router;
