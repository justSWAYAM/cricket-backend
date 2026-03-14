import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const router = Router();
const pool    = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

const HARD_TEAMS = ["SRH", "RCB", "KKR", "MI", "CSK", "PBKS", "RR", "DC"];
const HARD_TEAMS_SQL = HARD_TEAMS.map(t => `'${t}'`).join(",");

const METRIC_CONFIG: Record<string, {
  statType: string;
  field: string;
  operator: "gte" | "lte" | "gt" | "lt";
  value: number;
}> = {
  // ── Runs ──────────────────────────────────────────────────────
  SR_GT_150:   { statType: "Most Runs",    field: "SR",        operator: "gt",  value: 150  },
  RUNS_1000:   { statType: "Most Runs",    field: "Runs",      operator: "gte", value: 1000 },
  SIXES_40:    { statType: "Most Runs",    field: "6s",        operator: "gte", value: 40   },
  AVE_GT_35:   { statType: "Most Runs",    field: "Ave",       operator: "gt",  value: 35   },
  FOURS_100:   { statType: "Most Runs",    field: "4s",        operator: "gte", value: 100  },
  SR_GT_160:   { statType: "Most Runs",    field: "SR",        operator: "gt",  value: 160  },
  SIXES_50:    { statType: "Most Runs",    field: "6s",        operator: "gte", value: 50   },
  AVE_GT_40:   { statType: "Most Runs",    field: "Ave",       operator: "gt",  value: 40   },
  RUNS_2000:   { statType: "Most Runs",    field: "Runs",      operator: "gte", value: 2000 },
  CENTURY_2:   { statType: "Most Runs",    field: "Centuries", operator: "gte", value: 2    },
  // ── Wickets ───────────────────────────────────────────────────
  BOWL_AVE_22: { statType: "Most Wickets", field: "Ave",       operator: "lt",  value: 22   },
  BOWL_SR_15:  { statType: "Most Wickets", field: "SR",        operator: "lt",  value: 15   },
  ECON_7:      { statType: "Most Wickets", field: "Econ",      operator: "lt",  value: 7    },
  BOWL_AVE_20: { statType: "Most Wickets", field: "Ave",       operator: "lt",  value: 20   },
  WKTS_50:     { statType: "Most Wickets", field: "Wkts",      operator: "gte", value: 50   },
  FOURWKT_2:   { statType: "Most Wickets", field: "4w",        operator: "gte", value: 2    },
};

// Safe numeric cast: strips trailing "*" (not-out scores like "104*"),
// rejects "-", empty string, and bowling figures like "1/10".
// Returns NULL for anything non-numeric so the comparison is simply skipped.
const SAFE_CAST = (field: string) =>
  `NULLIF(REGEXP_REPLACE(tp."specificStats"->>'${field}', '\\*$', ''), '-')::float`;

async function getPlayersForCriterion(code: string): Promise<Set<string>> {
  try {
    // ── TEAM ────────────────────────────────────────────────────
    if (HARD_TEAMS.includes(code)) {
      const rows = await prisma.playerIPLTeam.findMany({
        where: { team: { code } },
        select: { player: { select: { name: true } } },
      });
      return new Set(rows.map((r) => r.player.name.toLowerCase()));
    }

    // ── METRIC ──────────────────────────────────────────────────
    const config = METRIC_CONFIG[code];
    if (!config) {
      console.warn(`No METRIC_CONFIG entry for code: "${code}"`);
      return new Set();
    }

    const { statType, field, operator, value } = config;
    const opSql = { gte: ">=", lte: "<=", gt: ">", lt: "<" }[operator];

    // NULLIF handles "-" → NULL (skipped by comparison)
    // REGEXP_REPLACE strips trailing "*" from not-out scores like "104*"
    // Bowling figures like "1/10" cast to NULL via NULLIF after strip too
    // Value embedded as literal — safe because it comes from hardcoded METRIC_CONFIG
    const sql = `
      SELECT DISTINCT p.name
      FROM "TopPerformer" tp
      JOIN "Player" p ON p.id = tp."playerId"
      WHERE tp."statType" = $1
        AND tp.team IN (${HARD_TEAMS_SQL})
        AND ${SAFE_CAST(field)} ${opSql} ${value}
    `;

    const rows = await prisma.$queryRawUnsafe<{ name: string }[]>(sql, statType);
    console.log(`  [${code}] "${field}" ${opSql} ${value} → ${rows.length} players`);
    return new Set(rows.map((r) => r.name.toLowerCase()));

  } catch (err) {
    console.error(`getPlayersForCriterion(${code}) failed:`, err);
    return new Set();
  }
}

router.get("/hard-cells", async (req: Request, res: Response) => {
  const rowCodes = String(req.query.rows || "").split(",").map((s) => s.trim()).filter(Boolean);
  const colCodes = String(req.query.cols || "").split(",").map((s) => s.trim()).filter(Boolean);

  if (rowCodes.length !== 3 || colCodes.length !== 3) {
    return res.status(400).json({ error: "Must provide exactly 3 row and 3 col codes" });
  }

  try {
    const [r0, r1, r2, c0, c1, c2] = await Promise.all([
      getPlayersForCriterion(rowCodes[0]),
      getPlayersForCriterion(rowCodes[1]),
      getPlayersForCriterion(rowCodes[2]),
      getPlayersForCriterion(colCodes[0]),
      getPlayersForCriterion(colCodes[1]),
      getPlayersForCriterion(colCodes[2]),
    ]);

    const rowSets = [r0, r1, r2];
    const colSets = [c0, c1, c2];

    const result: Record<string, string[]> = {};
    for (let ri = 0; ri < 3; ri++) {
      for (let ci = 0; ci < 3; ci++) {
        const cellIndex = ri * 3 + ci;
        result[String(cellIndex)] = [...rowSets[ri]].filter((n) => colSets[ci].has(n));
      }
    }

    const counts = Object.entries(result).map(([k, v]) => `cell${k}:${v.length}`).join(" ");
    console.log(`hard-cells [${rowCodes}] x [${colCodes}] → ${counts}`);

    return res.json(result);
  } catch (err) {
    console.error("hard-cells error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;