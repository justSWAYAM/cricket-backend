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

// GET /api/players
// Returns all players with their IPL team codes
router.get("/", async (req: Request, res: Response) => {
  try {
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

    const shaped = players.map((p) => ({
      id: p.id,
      name: p.name,
      nationality: p.nationality,
      teams: p.iplTeams.map((t) => t.team.code),
    }));

    res.json(shaped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

export default router;