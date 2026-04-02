import { randomUUID } from "crypto";
import { getSupabaseAdmin, normalizeMaybeSingleError, throwIfSupabaseError } from "../lib/supabase.js";

function sortByPlayedDateDescending(scores) {
  return [...scores].sort(
    (left, right) => new Date(right.playedAt).getTime() - new Date(left.playedAt).getTime()
  );
}

function calculateRollingAverage(scores) {
  if (!scores.length) {
    return null;
  }

  const total = scores.reduce((sum, score) => sum + score.grossScore, 0);
  return Number((total / scores.length).toFixed(2));
}

function mapScoreRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    courseName: row.course_name,
    grossScore: row.gross_score,
    playedAt: row.played_at,
    createdAt: row.created_at,
  };
}

async function pruneScoresForUser(userId) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("scores")
    .select("id")
    .eq("user_id", userId)
    .order("played_at", { ascending: false })
    .order("created_at", { ascending: false });

  throwIfSupabaseError(error, "Unable to prune old score entries.");

  const scores = data || [];
  const extraScores = scores.slice(5).map((entry) => entry.id);

  if (!extraScores.length) {
    return;
  }

  const { error: deleteError } = await supabase.from("scores").delete().in("id", extraScores);
  throwIfSupabaseError(deleteError, "Unable to remove old score entries.");
}

export async function listScoresForUser(userId) {
  await pruneScoresForUser(userId);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", userId)
    .order("played_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  throwIfSupabaseError(error, "Unable to load scores.");

  const scores = (data || []).map(mapScoreRow);
  const rollingWindow = scores.slice(0, 5);

  return {
    scores,
    rollingWindow,
    rollingAverage: calculateRollingAverage(rollingWindow),
  };
}

export async function createScoreForUser(userId, payload) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("scores")
    .insert({
      id: randomUUID(),
      user_id: userId,
      course_name: payload.courseName.trim(),
      gross_score: Number(payload.grossScore),
      played_at: payload.playedAt,
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  throwIfSupabaseError(error, "Unable to create the score entry.");
  await pruneScoresForUser(userId);
  return mapScoreRow(data);
}

export async function updateScoreForUser(userId, scoreId, payload) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("scores")
    .update({
      course_name: payload.courseName.trim(),
      gross_score: Number(payload.grossScore),
      played_at: payload.playedAt,
    })
    .eq("id", scoreId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  normalizeMaybeSingleError(error);

  if (!data) {
    const notFoundError = new Error("Score entry not found.");
    notFoundError.status = 404;
    throw notFoundError;
  }

  await pruneScoresForUser(userId);
  return mapScoreRow(data);
}
