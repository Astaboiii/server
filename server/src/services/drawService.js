import { randomUUID } from "crypto";
import { plans, prizeRules } from "../data/platformData.js";
import {
  getSupabaseAdmin,
  normalizeMaybeSingleError,
  throwIfSupabaseError,
} from "../lib/supabase.js";

const prizePoolContributionRate = 0.5;

function sortScoresDescending(scores) {
  return [...scores].sort(
    (left, right) => new Date(right.playedAt).getTime() - new Date(left.playedAt).getTime()
  );
}

function buildFallbackDigits(userId) {
  return userId
    .replace(/[^a-z0-9]/gi, "")
    .split("")
    .map((character) => character.charCodeAt(0) % 10);
}

function buildRandomTicketNumbers(userId, scores) {
  const digits = sortScoresDescending(scores)
    .slice(0, 5)
    .map((score) => score.grossScore % 10);
  const fallbackDigits = buildFallbackDigits(userId);

  while (digits.length < 5) {
    digits.push(fallbackDigits[digits.length % fallbackDigits.length] ?? 0);
  }

  return digits.slice(0, 5);
}

function buildAlgorithmicTicketNumbers(userId, scores, allScores) {
  const recentDigits = sortScoresDescending(scores)
    .slice(0, 5)
    .map((score) => score.grossScore % 10);
  const frequency = new Map();

  for (const score of allScores || []) {
    const digit = score.grossScore % 10;
    frequency.set(digit, (frequency.get(digit) || 0) + 1);
  }

  const uniqueDigits = [...new Set(recentDigits)];
  uniqueDigits.sort((a, b) => {
    const left = frequency.get(a) || 0;
    const right = frequency.get(b) || 0;
    return left - right || a - b;
  });

  const ticketNumbers = [...uniqueDigits];
  const fallbackDigits = buildFallbackDigits(userId);

  while (ticketNumbers.length < 5) {
    ticketNumbers.push(fallbackDigits[ticketNumbers.length % fallbackDigits.length] ?? 0);
  }

  return ticketNumbers.slice(0, 5);
}

function buildTicketNumbers(userId, scores, mode, allScores) {
  if (mode === "algorithmic") {
    return buildAlgorithmicTicketNumbers(userId, scores, allScores);
  }

  return buildRandomTicketNumbers(userId, scores);
}

function countMatches(ticketNumbers, winningNumbers) {
  const counts = new Map();

  for (const number of winningNumbers) {
    counts.set(number, (counts.get(number) || 0) + 1);
  }

  let matches = 0;

  for (const number of ticketNumbers) {
    const remaining = counts.get(number) || 0;

    if (remaining > 0) {
      matches += 1;
      counts.set(number, remaining - 1);
    }
  }

  return matches;
}

function getPlanPrice(planId) {
  return plans.find((plan) => plan.id === planId)?.price || 0;
}

function getPeriodKey(input) {
  return input || new Date().toISOString().slice(0, 7);
}

function formatCurrency(value) {
  return Number(value.toFixed(2));
}

function mapSubscriptionRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    status: row.status,
    renewalDate: row.renewal_date,
  };
}

function mapScoreRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    courseName: row.course_name,
    grossScore: row.gross_score,
    playedAt: row.played_at,
  };
}

function normalizeSubscriptionStatus(subscription) {
  if (subscription.status === "active" && subscription.renewalDate) {
    const renewalDate = new Date(subscription.renewalDate);

    if (renewalDate.getTime() < Date.now()) {
      return "lapsed";
    }
  }

  return subscription.status;
}

function mapDrawRow(row) {
  return {
    id: row.id,
    periodKey: row.period_key,
    winningNumbers: row.winning_numbers,
    drawMode: row.draw_mode || "random",
    basePrizePool: Number(row.base_prize_pool || 0),
    jackpotCarryoverIn: Number(row.jackpot_carryover_in || 0),
    jackpotCarryoverOut: Number(row.jackpot_carryover_out || 0),
    createdAt: row.created_at,
  };
}

function mapDrawResultRow(row) {
  return {
    id: row.id,
    drawId: row.draw_id,
    userId: row.user_id,
    ticketNumbers: row.ticket_numbers,
    matchCount: row.match_count,
    amountWon: Number(row.amount_won || 0),
  };
}

export async function getUserDrawSummary(userId, subscriptionStatus) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("draw_results")
    .select("draw_id, match_count, amount_won")
    .eq("user_id", userId);

  throwIfSupabaseError(error, "Unable to load user draw results.");
  const drawResults = data || [];
  let latestResult = null;

  if (drawResults.length) {
    const drawIds = [...new Set(drawResults.map((entry) => entry.draw_id))];
    const { data: draws, error: drawsError } = await supabase
      .from("draws")
      .select("id, period_key")
      .in("id", drawIds);

    throwIfSupabaseError(drawsError, "Unable to load draw periods.");

    const drawPeriods = new Map((draws || []).map((draw) => [draw.id, draw.period_key]));
    latestResult = [...drawResults]
      .map((entry) => ({
        periodKey: drawPeriods.get(entry.draw_id),
        matchCount: entry.match_count,
        amountWon: Number(entry.amount_won || 0),
      }))
      .sort((left, right) => String(right.periodKey).localeCompare(String(left.periodKey)))[0] || null;
  }

  return {
    drawsEntered: drawResults.length,
    upcomingDraws: subscriptionStatus === "active" ? 1 : 0,
    latestResult,
  };
}

export async function runMonthlyDraw({ winningNumbers, periodKey, mode = "random", simulate = false }) {
  const supabase = getSupabaseAdmin();
  const drawPeriodKey = getPeriodKey(periodKey);
  const { data: existingDraw, error: existingError } = await supabase
    .from("draws")
    .select("id")
    .eq("period_key", drawPeriodKey)
    .maybeSingle();

  normalizeMaybeSingleError(existingError);

  if (existingDraw && !simulate) {
    const error = new Error("A draw has already been run for this month.");
    error.status = 409;
    throw error;
  }

  const [{ data: subscriptionRows, error: subscriptionsError }, { data: latestDrawRow, error: latestDrawError }] = await Promise.all([
    supabase.from("subscriptions").select("*"),
    supabase.from("draws").select("*").order("period_key", { ascending: false }).limit(1).maybeSingle(),
  ]);

  throwIfSupabaseError(subscriptionsError, "Unable to load subscriptions for the draw.");
  normalizeMaybeSingleError(latestDrawError);

  const activeSubscriptions = (subscriptionRows || [])
    .map(mapSubscriptionRow)
    .filter((subscription) => normalizeSubscriptionStatus(subscription) === "active");
  const userIds = activeSubscriptions.map((subscription) => subscription.userId);
  let scoreRows = [];

  if (userIds.length) {
    const { data, error } = await supabase
      .from("scores")
      .select("*")
      .in("user_id", userIds);

    throwIfSupabaseError(error, "Unable to load scores for draw participants.");
    scoreRows = data || [];
  }

  const scoresByUserId = new Map();

  for (const score of scoreRows.map(mapScoreRow)) {
    if (!scoresByUserId.has(score.userId)) {
      scoresByUserId.set(score.userId, []);
    }

    scoresByUserId.get(score.userId).push(score);
  }

  const participants = activeSubscriptions.map((subscription) => ({
    userId: subscription.userId,
    ticketNumbers: buildTicketNumbers(
      subscription.userId,
      scoresByUserId.get(subscription.userId) || [],
      mode,
      scoreRows.map(mapScoreRow)
    ),
    planId: subscription.planId,
  }));

  const finalWinningNumbers =
    winningNumbers && winningNumbers.length === 5
      ? winningNumbers.map(Number)
      : Array.from({ length: 5 }, () => Math.floor(Math.random() * 10));
  const latestDraw = latestDrawRow ? mapDrawRow(latestDrawRow) : null;
  const jackpotCarryoverIn = latestDraw?.jackpotCarryoverOut || 0;
  const basePrizePool = activeSubscriptions.reduce(
    (sum, subscription) => sum + getPlanPrice(subscription.planId) * prizePoolContributionRate,
    0
  );
  const poolForFiveMatch = basePrizePool * 0.4 + jackpotCarryoverIn;
  const poolForFourMatch = basePrizePool * 0.35;
  const poolForThreeMatch = basePrizePool * 0.25;

  const results = participants.map((participant) => ({
    id: randomUUID(),
    userId: participant.userId,
    ticketNumbers: participant.ticketNumbers,
    matchCount: countMatches(participant.ticketNumbers, finalWinningNumbers),
    amountWon: 0,
  }));

  const fiveWinners = results.filter((result) => result.matchCount === 5);
  const fourWinners = results.filter((result) => result.matchCount === 4);
  const threeWinners = results.filter((result) => result.matchCount === 3);

  if (fiveWinners.length) {
    const share = formatCurrency(poolForFiveMatch / fiveWinners.length);
    fiveWinners.forEach((winner) => {
      winner.amountWon = share;
    });
  }

  if (fourWinners.length) {
    const share = formatCurrency(poolForFourMatch / fourWinners.length);
    fourWinners.forEach((winner) => {
      winner.amountWon = share;
    });
  }

  if (threeWinners.length) {
    const share = formatCurrency(poolForThreeMatch / threeWinners.length);
    threeWinners.forEach((winner) => {
      winner.amountWon = share;
    });
  }

  const drawId = randomUUID();
  const drawMetadata = {
    id: drawId,
    period_key: drawPeriodKey,
    winning_numbers: finalWinningNumbers,
    draw_mode: mode,
    base_prize_pool: formatCurrency(basePrizePool),
    jackpot_carryover_in: formatCurrency(jackpotCarryoverIn),
    jackpot_carryover_out: fiveWinners.length ? 0 : formatCurrency(poolForFiveMatch),
    created_at: new Date().toISOString(),
  };

  if (simulate) {
    return {
      simulated: true,
      draw: {
        ...mapDrawRow(drawMetadata),
      },
      results: results.map((result) => ({
        userId: result.userId,
        ticketNumbers: result.ticketNumbers,
        matchCount: result.matchCount,
        amountWon: result.amountWon,
      })),
    };
  }

  const { data: drawRow, error: drawError } = await supabase
    .from("draws")
    .insert(drawMetadata)
    .select("*")
    .single();

  throwIfSupabaseError(drawError, "Unable to create the monthly draw.");

  if (results.length) {
    const { error } = await supabase.from("draw_results").insert(
      results.map((result) => ({
        id: result.id,
        draw_id: drawId,
        user_id: result.userId,
        ticket_numbers: result.ticketNumbers,
        match_count: result.matchCount,
        amount_won: result.amountWon,
      }))
    );

    throwIfSupabaseError(error, "Unable to store monthly draw results.");
  }

  for (const winner of results.filter((result) => result.amountWon > 0)) {
    const { data: winningsRow, error: winningsError } = await supabase
      .from("winnings")
      .select("*")
      .eq("user_id", winner.userId)
      .maybeSingle();

    normalizeMaybeSingleError(winningsError);

    if (!winningsRow) {
      continue;
    }

    const { error } = await supabase
      .from("winnings")
      .update({
        total_won: formatCurrency(Number(winningsRow.total_won || 0) + winner.amountWon),
        payment_status: "Pending review",
        last_updated_at: new Date().toISOString(),
      })
      .eq("user_id", winner.userId);

    throwIfSupabaseError(error, "Unable to update winnings after the draw.");
  }

  return {
    ...mapDrawRow(drawRow),
    results: results.map((result) => ({
      userId: result.userId,
      ticketNumbers: result.ticketNumbers,
      matchCount: result.matchCount,
      amountWon: result.amountWon,
    })),
  };
}

export async function getAdminDrawSummary() {
  const supabase = getSupabaseAdmin();
  const { data: drawRows, error: drawsError } = await supabase
    .from("draws")
    .select("*")
    .order("period_key", { ascending: false });

  throwIfSupabaseError(drawsError, "Unable to load draw history.");
  const draws = (drawRows || []).map(mapDrawRow);
  const latestDraw = draws[0] || null;

  if (!draws.length) {
    return {
      draws: [],
      latestDraw: null,
      prizeRules,
    };
  }

  const drawIds = draws.map((draw) => draw.id);
  const { data: resultRows, error: resultsError } = await supabase
    .from("draw_results")
    .select("*")
    .in("draw_id", drawIds);

  throwIfSupabaseError(resultsError, "Unable to load draw results.");

  const resultsByDrawId = new Map();
  const winnerUserIds = new Set();

  for (const result of (resultRows || []).map(mapDrawResultRow)) {
    if (!resultsByDrawId.has(result.drawId)) {
      resultsByDrawId.set(result.drawId, []);
    }

    resultsByDrawId.get(result.drawId).push(result);

    if (result.amountWon > 0) {
      winnerUserIds.add(result.userId);
    }
  }

  let usersById = new Map();

  if (winnerUserIds.size) {
    const { data: userRows, error: usersError } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", [...winnerUserIds]);

    throwIfSupabaseError(usersError, "Unable to load users for draw results.");
    usersById = new Map((userRows || []).map((row) => [row.id, row]));
  }

  return {
    draws: draws.map((draw) => ({
      id: draw.id,
      periodKey: draw.periodKey,
      winningNumbers: draw.winningNumbers,
      basePrizePool: draw.basePrizePool,
      jackpotCarryoverIn: draw.jackpotCarryoverIn,
      jackpotCarryoverOut: draw.jackpotCarryoverOut,
      totalWinners: (resultsByDrawId.get(draw.id) || []).filter((result) => result.amountWon > 0).length,
    })),
    latestDraw: latestDraw
      ? {
          ...latestDraw,
          results: (resultsByDrawId.get(latestDraw.id) || [])
            .map((result) => ({
              ...result,
              userName: usersById.get(result.userId)?.name || "Unknown user",
              userEmail: usersById.get(result.userId)?.email || "Unknown email",
            }))
            .sort((left, right) => right.amountWon - left.amountWon || right.matchCount - left.matchCount),
        }
      : null,
    prizeRules,
  };
}
