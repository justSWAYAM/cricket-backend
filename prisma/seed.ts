import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";
import csv from "csv-parser";

// Necessary Change 1: Dynamic connection string for Docker/Local
const connectionString = process.env.DATABASE_URL || "postgresql://swayammishra:9870066247@localhost:5432/cricketxi";

const pool = new pg.Pool({
  connectionString: connectionString,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const IPL_TEAMS: Record<string, string> = {
  MI: "Mumbai Indians",
  CSK: "Chennai Super Kings",
  RCB: "Royal Challengers Bangalore",
  KKR: "Kolkata Knight Riders",
  DC: "Delhi Capitals",
  DD: "Delhi Daredevils",
  SRH: "Sunrisers Hyderabad",
  PBKS: "Punjab Kings",
  KXIP: "Kings XI Punjab",
  RR: "Rajasthan Royals",
  GT: "Gujarat Titans",
  LSG: "Lucknow Super Giants",
  DQ: "Deccan Chargers",
  PWI: "Pune Warriors India",
  GL: "Gujarat Lions",
  RPSG: "Rising Pune Supergiant",
  KTK: "Kochi Tuskers Kerala",
};

// --- FUNCTION: Seed Top Performers ---
async function seedTopPerformers() {
  console.log("🏆 Seeding Top Performers...");
  
  // Necessary Change 2: Relative path for Docker context
  const baseDir = path.join(process.cwd(), "data/top-performers");
  const categories = ["runs", "wickets"];

  let aliases: Record<string, string> = {};
  const aliasPath = path.join(baseDir, "aliases.json");
  if (fs.existsSync(aliasPath)) {
    aliases = JSON.parse(fs.readFileSync(aliasPath, "utf-8"));
  } else {
    console.warn("⚠️ aliases.json not found! Name matching might fail.");
  }

  const allPlayers = await prisma.player.findMany();
  const playerMap: Record<string, string> = {}; 
  allPlayers.forEach(p => {
    playerMap[p.name] = p.id;
  });

  let inserted = 0;
  let unmatchedNames = new Set<string>();

  for (const category of categories) {
    const folderPath = `${baseDir}/${category}`;
    if (!fs.existsSync(folderPath)) continue;

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".json"));

    for (const file of files) {
      if (file === "aliases.json") continue; 

      const filePath = `${folderPath}/${file}`;
      const fileData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      const team = fileData.team;
      const statType = fileData.stat;
      const players = fileData.players || [];

      for (const p of players) {
        const { Rank, Player, Span, Mat, Link, ...specificStats } = p;
        
        const rawName = Player.trim();
        const realName = aliases[rawName] || rawName;
        
        const dbPlayerId = playerMap[realName] || null;

        if (!dbPlayerId) {
          unmatchedNames.add(`${rawName} (Tried searching: ${realName})`);
        }

        await prisma.topPerformer.create({
          data: {
            team: team,
            statType: statType,
            rank: Number(Rank),
            playerName: rawName,
            span: Span || "",
            matches: Mat ? Number(Mat) : null,
            specificStats: specificStats,
            playerId: dbPlayerId 
          }
        });
        inserted++;
      }
    }
  }
  
  console.log(`✅ ${inserted} Top Performer records inserted`);
  if (unmatchedNames.size > 0) {
    console.log(`⚠️ In players ka naam DB mein match nahi hua. Unhe aliases.json mein add karo:`);
    console.log([...unmatchedNames].join(", "));
  }
}

// --- MAIN FUNCTION ---
async function main() {
  console.log("🌱 Seeding started...");

  // Step 1: Create all IPL teams
  const teamMap: Record<string, string> = {};
  for (const [code, name] of Object.entries(IPL_TEAMS)) {
    const team = await prisma.iPLTeam.upsert({
      where: { code },
      update: {},
      create: { code, name },
    });
    teamMap[code] = team.id;
  }
  console.log(`✅ ${Object.keys(teamMap).length} teams ready`);

  // Step 2: Read CSV
  const rows: { Player: string; Nationality: string; "Teams Played For": string }[] = [];
  await new Promise<void>((resolve, reject) => {
    // Necessary Change 3: Relative path for CSV
    const csvPath = path.join(process.cwd(), "data/players/ipl_players_master.csv");
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });
  console.log(`📄 ${rows.length} rows found in CSV`);

  // Step 3: Insert players + team links
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = row["Player"]?.trim();
    const nationality = row["Nationality"]?.trim();
    const teamsRaw = row["Teams Played For"]?.trim();

    if (!name || !nationality || !teamsRaw) {
      skipped++;
      continue;
    }

    const teamCodes = teamsRaw.split(",").map((t) => t.trim()).filter(Boolean);

    const player = await prisma.player.upsert({
      where: { name },
      update: {},
      create: { name, nationality },
    });

    for (const code of teamCodes) {
      const teamId = teamMap[code];
      if (!teamId) {
        continue;
      }
      await prisma.playerIPLTeam.upsert({
        where: { playerId_teamId: { playerId: player.id, teamId } },
        update: {},
        create: { playerId: player.id, teamId },
      });
    }
    inserted++;
  }

  console.log(`✅ ${inserted} players inserted from CSV`);
  if (skipped > 0) console.log(`⚠️  ${skipped} rows skipped`);

  // Step 4: Yahan aakar Top Performers daale jayenge, kyunki ab DB mein players aa chuke hain!
  await seedTopPerformers();

  console.log("🎉 All Done!");
}

main()
  .catch((e) => { console.error("❌", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });