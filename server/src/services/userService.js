import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { allowedRoles, devAdmin } from "../config/authConfig.js";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  normalizeMaybeSingleError,
  throwIfSupabaseError,
} from "../lib/supabase.js";
import { ensureAllUsersHaveMemberState } from "./memberService.js";
import { getCharityById } from "./charityService.js";

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function normalizeContributionPercentage(value) {
  if (typeof value === "undefined" || value === null) {
    return null;
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric) || numeric < 10 || numeric > 100) {
    const error = new Error("Contribution percentage must be a number between 10 and 100.");
    error.status = 400;
    throw error;
  }

  return numeric;
}

function mapUserRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  };
}

async function findUserRowByEmail(email) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", normalizeEmail(email))
    .maybeSingle();

  normalizeMaybeSingleError(error);
  return data || null;
}

async function findUserRowById(id) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  normalizeMaybeSingleError(error);
  return data || null;
}

export async function ensureAdminSeed() {
  if (!isSupabaseConfigured()) {
    console.warn("Supabase is not configured yet. Skipping admin seed until credentials are added.");
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("role", "admin")
    .limit(1);

  throwIfSupabaseError(error, "Unable to check for existing admin users.");

  if (data?.length) {
    await ensureAllUsersHaveMemberState();
    return;
  }

  const passwordHash = await bcrypt.hash(devAdmin.password, 10);
  const { error: insertError } = await supabase.from("users").insert({
    id: randomUUID(),
    name: devAdmin.name,
    email: normalizeEmail(devAdmin.email),
    password_hash: passwordHash,
    role: devAdmin.role,
    created_at: new Date().toISOString(),
  });

  throwIfSupabaseError(insertError, "Unable to seed the default admin user.");
  await ensureAllUsersHaveMemberState();
}

export async function createUser({
  name,
  email,
  password,
  role = "subscriber",
  charityId,
  contributionPercentage,
  donationAmount,
}) {
  if (!allowedRoles.includes(role)) {
    const error = new Error("Invalid role supplied.");
    error.status = 400;
    throw error;
  }

  const existingUser = await findUserRowByEmail(email);

  if (existingUser) {
    const error = new Error("An account with this email already exists.");
    error.status = 409;
    throw error;
  }

  const charity = charityId ? await getCharityById(charityId) : null;

  if (charityId && !charity) {
    const error = new Error("Selected charity does not exist.");
    error.status = 404;
    throw error;
  }

  const normalizedContribution = contributionPercentage
    ? normalizeContributionPercentage(contributionPercentage)
    : charity?.contributionPercentage ?? null;
  const normalizedDonation = donationAmount
    ? Number(donationAmount)
    : 0;

  const supabase = getSupabaseAdmin();
  const passwordHash = await bcrypt.hash(password, 10);
  const nextUser = {
    id: randomUUID(),
    name: name.trim(),
    email: normalizeEmail(email),
    password_hash: passwordHash,
    role,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("users")
    .insert(nextUser)
    .select("*")
    .single();

  throwIfSupabaseError(error, "Unable to create the user account.");

  if (charity) {
    const { error: selectionError } = await supabase.from("charity_selections").insert({
      id: randomUUID(),
      user_id: data.id,
      charity_id: charity.id,
      contribution_percentage: normalizedContribution,
      extra_donation_amount: normalizedDonation,
      updated_at: new Date().toISOString(),
    });

    throwIfSupabaseError(selectionError, "Unable to create the charity selection.");
  }

  await ensureAllUsersHaveMemberState();

  return mapUserRow(data);
}

export async function authenticateUser({ email, password }) {
  const user = await findUserRowByEmail(email);

  if (!user) {
    const error = new Error("Invalid email or password.");
    error.status = 401;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    const error = new Error("Invalid email or password.");
    error.status = 401;
    throw error;
  }

  return mapUserRow(user);
}

export async function getUserById(id) {
  const user = await findUserRowById(id);
  return mapUserRow(user);
}

export async function updateUserById(id, updates) {
  const normalized = {};

  if (typeof updates.name === "string") {
    normalized.name = updates.name.trim();
  }

  if (typeof updates.email === "string") {
    normalized.email = normalizeEmail(updates.email);
  }

  if (typeof updates.role === "string") {
    if (!allowedRoles.includes(updates.role)) {
      const error = new Error("Invalid role supplied.");
      error.status = 400;
      throw error;
    }

    normalized.role = updates.role;
  }

  if (!Object.keys(normalized).length) {
    const error = new Error("No valid fields were provided for update.");
    error.status = 400;
    throw error;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .update(normalized)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  normalizeMaybeSingleError(error);

  if (!data) {
    const notFoundError = new Error("User not found.");
    notFoundError.status = 404;
    throw notFoundError;
  }

  return mapUserRow(data);
}
