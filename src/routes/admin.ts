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

// Simple password-based auth (for demo purposes)
// In production, use proper authentication with JWT, bcrypt, etc.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// POST /api/admin/login
router.post("/login", (req: Request, res: Response) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    // In production, generate a JWT token here
    res.json({ success: true, token: "admin-authenticated" });
  } else {
    res.status(401).json({ error: "Invalid password" });
  }
});

// GET /api/admin/feedback
// Get all feedback submissions (requires auth)
router.get("/feedback", async (req: Request, res: Response) => {
  try {
    // Simple auth check - in production, use middleware to verify JWT
    const authHeader = req.headers.authorization;
    if (authHeader !== "Bearer admin-authenticated") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const feedback = await prisma.feedback.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(feedback);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

// PATCH /api/admin/feedback/:id
// Update feedback status
router.patch("/feedback/:id", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader !== "Bearer admin-authenticated") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "reviewed", "added", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const feedback = await prisma.feedback.update({
      where: { id },
      data: { status },
    });

    res.json(feedback);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update feedback" });
  }
});

export default router;
