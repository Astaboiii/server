import { createClient } from "@supabase/supabase-js";

let supabaseAdminClient = null;

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) {
    const error = new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env before using database-backed routes."
    );
    error.status = 500;
    throw error;
  }

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }

  return supabaseAdminClient;
}

export function throwIfSupabaseError(error, fallbackMessage = "Database request failed.") {
  if (!error) {
    return;
  }

  const wrapped = new Error(error.message || fallbackMessage);
  wrapped.status = 500;
  wrapped.cause = error;
  throw wrapped;
}

export function normalizeMaybeSingleError(error) {
  if (!error) {
    return null;
  }

  if (error.code === "PGRST116") {
    return null;
  }

  throwIfSupabaseError(error);
  return null;
}

export function isSupabaseMissingColumnError(error, columnName) {
  if (!error?.message || !columnName) {
    return false;
  }

  const message = String(error.message).toLowerCase();
  const column = columnName.toLowerCase();

  return message.includes(column) && message.includes("column") && message.includes("does not exist");
}
