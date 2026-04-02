import "dotenv/config";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = path.resolve(__dirname, "../data/appData.json");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env");
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function readJsonFile() {
  return fs.readFile(jsonPath, "utf8").then((raw) => JSON.parse(raw));
}

async function upsert(table, rows, onConflict = "id") {
  if (!rows.length) {
    return;
  }

  const { error } = await supabase.from(table).upsert(rows, { onConflict });

  if (error) {
    throw error;
  }
}

async function run() {
  const state = await readJsonFile();

  await upsert(
    "users",
    (state.users || []).map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      password_hash: user.passwordHash,
      role: user.role,
      created_at: user.createdAt,
    }))
  );

  await upsert(
    "subscriptions",
    (state.subscriptions || []).map((subscription) => ({
      id: subscription.id,
      user_id: subscription.userId,
      plan_id: subscription.planId,
      status: subscription.status,
      renewal_date: subscription.renewalDate,
      started_at: subscription.startedAt,
      cancelled_at: subscription.canceledAt,
    })),
    "id"
  );

  await upsert(
    "charity_selections",
    (state.charitySelections || []).map((selection) => ({
      id: selection.id,
      user_id: selection.userId,
      charity_id: selection.charityId,
      contribution_percentage: selection.contributionPercentage,
      updated_at: selection.updatedAt,
    })),
    "id"
  );

  await upsert(
    "winnings",
    (state.winnings || []).map((winnings) => ({
      id: winnings.id,
      user_id: winnings.userId,
      total_won: winnings.totalWon,
      payment_status: winnings.paymentStatus,
      last_updated_at: winnings.lastUpdatedAt,
    })),
    "id"
  );

  await upsert(
    "scores",
    (state.scores || []).map((score) => ({
      id: score.id,
      user_id: score.userId,
      course_name: score.courseName,
      gross_score: score.grossScore,
      played_at: score.playedAt,
      created_at: score.createdAt,
    })),
    "id"
  );

  await upsert(
    "draws",
    (state.draws || []).map((draw) => ({
      id: draw.id,
      period_key: draw.periodKey,
      winning_numbers: draw.winningNumbers,
      base_prize_pool: draw.basePrizePool,
      jackpot_carryover_in: draw.jackpotCarryoverIn,
      jackpot_carryover_out: draw.jackpotCarryoverOut,
      created_at: draw.createdAt,
    })),
    "id"
  );

  await upsert(
    "draw_results",
    (state.draws || []).flatMap((draw) =>
      (draw.results || []).map((result) => ({
        id: result.id || `${draw.id}-${result.userId}`,
        draw_id: draw.id,
        user_id: result.userId,
        ticket_numbers: result.ticketNumbers,
        match_count: result.matchCount,
        amount_won: result.amountWon,
      }))
    ),
    "id"
  );

  await upsert(
    "proof_submissions",
    (state.proofSubmissions || []).map((proof) => ({
      id: proof.id,
      user_id: proof.userId,
      original_file_name: proof.originalFileName,
      public_url: proof.publicUrl,
      status: proof.status,
      created_at: proof.createdAt,
      reviewed_at: proof.reviewedAt || null,
    })),
    "id"
  );

  console.log("JSON data migrated to Supabase successfully.");
}

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
