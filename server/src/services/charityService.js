import { getSupabaseAdmin, throwIfSupabaseError, normalizeMaybeSingleError } from "../lib/supabase.js";
import { charities as defaultCharities } from "../data/platformData.js";

function mapCharityRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    mission: row.mission,
    contributionPercentage: Number(row.contribution_percentage || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllCharities() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("charities")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throwIfSupabaseError(error, "Unable to load charities.");
  }

  if (!data || !data.length) {
    return defaultCharities;
  }

  return data.map(mapCharityRow);
}

export async function getCharityById(charityId) {
  if (!charityId) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("charities")
    .select("*")
    .eq("id", charityId)
    .maybeSingle();

  normalizeMaybeSingleError(error);

  if (data) {
    return mapCharityRow(data);
  }

  return defaultCharities.find((charity) => charity.id === charityId) || null;
}

export async function createCharity(payload) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("charities")
    .insert({
      id: payload.id,
      name: payload.name,
      mission: payload.mission,
      contribution_percentage: payload.contributionPercentage,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  throwIfSupabaseError(error, "Unable to create the charity.");
  return mapCharityRow(data);
}

export async function updateCharity(charityId, updates) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("charities")
    .update({
      name: updates.name,
      mission: updates.mission,
      contribution_percentage: updates.contributionPercentage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", charityId)
    .select("*")
    .maybeSingle();

  normalizeMaybeSingleError(error);

  if (!data) {
    const err = new Error("Charity not found.");
    err.status = 404;
    throw err;
  }

  return mapCharityRow(data);
}

export async function deleteCharity(charityId) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("charities").delete().eq("id", charityId);

  throwIfSupabaseError(error, "Unable to delete the charity.");
}
