import { getSupabaseAdmin, throwIfSupabaseError, normalizeMaybeSingleError } from "../lib/supabase.js";

export async function getAdminReportData() {
  const supabase = getSupabaseAdmin();

  const [
    { count: totalUsers, error: usersError },
    { count: totalSubscribers, error: subscribersError },
    { data: subscriptions, error: subscriptionsError },
    { data: charities, error: charitiesError },
    { data: draws, error: drawsError },
    { data: results, error: resultsError },
  ] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("subscriptions").select("*"),
    supabase.from("charity_selections").select("charity_id, contribution_percentage, extra_donation_amount"),
    supabase.from("draws").select("id, period_key, draw_mode, base_prize_pool, jackpot_carryover_out, created_at"),
    supabase.from("draw_results").select("draw_id, match_count, amount_won"),
  ]);

  throwIfSupabaseError(usersError, "Unable to count users.");
  throwIfSupabaseError(subscribersError, "Unable to count active subscribers.");
  throwIfSupabaseError(subscriptionsError, "Unable to load subscriptions.");
  throwIfSupabaseError(charitiesError, "Unable to load charity selections.");
  throwIfSupabaseError(drawsError, "Unable to load draws.");
  throwIfSupabaseError(resultsError, "Unable to load draw results.");

  const charityTotals = (charities || []).reduce((acc, row) => {
    const charityId = row.charity_id;
    const revenue = Number(row.contribution_percentage || 0);
    const donation = Number(row.extra_donation_amount || 0);

    if (!acc[charityId]) {
      acc[charityId] = { charityId, totalContributionPercentage: 0, totalDonationAmount: 0, members: 0 };
    }

    acc[charityId].members += 1;
    acc[charityId].totalContributionPercentage += revenue;
    acc[charityId].totalDonationAmount += donation;
    return acc;
  }, {});

  const drawSummary = (draws || []).reduce((acc, draw) => {
    acc[draw.id] = {
      drawId: draw.id,
      periodKey: draw.period_key,
      mode: draw.draw_mode,
      basePrizePool: Number(draw.base_prize_pool || 0),
      carryoverOut: Number(draw.jackpot_carryover_out || 0),
      createdAt: draw.created_at,
      totalWinners: 0,
    };
    return acc;
  }, {});

  for (const result of results || []) {
    if (result.amount_won > 0) {
      const drawRow = drawSummary[result.draw_id];
      if (drawRow) {
        drawRow.totalWinners += 1;
      }
    }
  }

  return {
    metrics: {
      totalUsers: Number(totalUsers || 0),
      activeSubscribers: Number(totalSubscribers || 0),
      totalSubscriptions: subscriptions ? subscriptions.length : 0,
      totalCharityPrograms: Object.keys(charityTotals).length,
    },
    charityTotals: Object.values(charityTotals),
    drawStats: Object.values(drawSummary),
  };
}
