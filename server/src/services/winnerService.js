import { randomUUID } from "crypto";
import path from "path";
import {
  getSupabaseAdmin,
  normalizeMaybeSingleError,
  throwIfSupabaseError,
} from "../lib/supabase.js";

const proofBucketName = process.env.SUPABASE_PROOF_BUCKET || "proof-uploads";
let proofBucketEnsured = false;

function getExtension(fileName) {
  const ext = path.extname(fileName || "").toLowerCase();
  return ext || ".png";
}

function getMimeType(fileName, base64Data) {
  const dataUrlMatch = String(base64Data || "").match(/^data:(.+?);base64,/i);

  if (dataUrlMatch?.[1]) {
    return dataUrlMatch[1];
  }

  const ext = getExtension(fileName);

  if (ext === ".jpg" || ext === ".jpeg") {
    return "image/jpeg";
  }

  if (ext === ".webp") {
    return "image/webp";
  }

  if (ext === ".gif") {
    return "image/gif";
  }

  return "image/png";
}

function decodeBase64(base64Data) {
  const cleaned = String(base64Data || "").includes(",")
    ? String(base64Data).split(",").pop()
    : String(base64Data || "");

  return Buffer.from(cleaned, "base64");
}

async function ensureProofBucket() {
  if (proofBucketEnsured) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.createBucket(proofBucketName, {
    public: true,
    fileSizeLimit: 6 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  });

  if (error && !String(error.message || "").toLowerCase().includes("already")) {
    throwIfSupabaseError(error, "Unable to prepare the proof uploads bucket.");
  }

  proofBucketEnsured = true;
}

async function writeProofFile({ userId, fileName, base64Data }) {
  await ensureProofBucket();
  const supabase = getSupabaseAdmin();
  const storedFileName = `${userId}/${randomUUID()}${getExtension(fileName)}`;
  const fileBuffer = decodeBase64(base64Data);
  const contentType = getMimeType(fileName, base64Data);
  const { error } = await supabase.storage
    .from(proofBucketName)
    .upload(storedFileName, fileBuffer, {
      contentType,
      upsert: false,
    });

  throwIfSupabaseError(error, "Unable to upload the proof file.");

  const { data } = supabase.storage.from(proofBucketName).getPublicUrl(storedFileName);

  return {
    storedFileName,
    publicUrl: data?.publicUrl || "",
  };
}

function mapWinningsRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    totalWon: Number(row.total_won || 0),
    paymentStatus: row.payment_status,
    lastUpdatedAt: row.last_updated_at,
  };
}

function mapProofRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    originalFileName: row.original_file_name,
    publicUrl: row.public_url,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

export async function getWinningsSummaryForUser(userId) {
  const supabase = getSupabaseAdmin();
  const [
    { data: winningsRow, error: winningsError },
    { data: latestProofRow, error: proofError },
  ] = await Promise.all([
    supabase.from("winnings").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("proof_submissions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  normalizeMaybeSingleError(winningsError);
  normalizeMaybeSingleError(proofError);

  return {
    winnings: mapWinningsRow(winningsRow),
    latestProof: mapProofRow(latestProofRow),
  };
}

export async function submitProofForUser(userId, payload) {
  if (!payload?.fileName || !payload?.base64Data) {
    const error = new Error("fileName and base64Data are required.");
    error.status = 400;
    throw error;
  }

  const supabase = getSupabaseAdmin();
  const { data: winningsRow, error: winningsError } = await supabase
    .from("winnings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  normalizeMaybeSingleError(winningsError);
  const winnings = mapWinningsRow(winningsRow);

  if (!winnings || winnings.totalWon <= 0) {
    const error = new Error("There are no winnings available for proof submission.");
    error.status = 400;
    throw error;
  }

  if (winnings.paymentStatus === "Paid") {
    const error = new Error("This winning has already been paid.");
    error.status = 400;
    throw error;
  }

  const file = await writeProofFile({
    userId,
    fileName: payload.fileName,
    base64Data: payload.base64Data,
  });
  const { data: proofRow, error: proofError } = await supabase
    .from("proof_submissions")
    .insert({
      id: randomUUID(),
      user_id: userId,
      original_file_name: payload.fileName,
      public_url: file.publicUrl,
      status: "Pending",
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  throwIfSupabaseError(proofError, "Unable to store the proof submission.");

  const { error: updateError } = await supabase
    .from("winnings")
    .update({
      payment_status: "Pending review",
      last_updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  throwIfSupabaseError(updateError, "Unable to update winnings after proof submission.");
  return mapProofRow(proofRow);
}

export async function listPendingProofs() {
  const supabase = getSupabaseAdmin();
  const { data: proofRows, error: proofError } = await supabase
    .from("proof_submissions")
    .select("*")
    .eq("status", "Pending")
    .order("created_at", { ascending: true });

  throwIfSupabaseError(proofError, "Unable to list pending proof submissions.");
  const proofs = (proofRows || []).map(mapProofRow);

  if (!proofs.length) {
    return [];
  }

  const userIds = [...new Set(proofs.map((proof) => proof.userId))];
  const [
    { data: userRows, error: usersError },
    { data: winningsRows, error: winningsError },
  ] = await Promise.all([
    supabase.from("users").select("id, name, email").in("id", userIds),
    supabase.from("winnings").select("*").in("user_id", userIds),
  ]);

  throwIfSupabaseError(usersError, "Unable to load users for proof review.");
  throwIfSupabaseError(winningsError, "Unable to load winnings for proof review.");

  const usersById = new Map((userRows || []).map((user) => [user.id, user]));
  const winningsByUserId = new Map(
    (winningsRows || []).map((row) => [row.user_id, mapWinningsRow(row)])
  );

  return proofs.map((proof) => {
    const user = usersById.get(proof.userId);
    const winnings = winningsByUserId.get(proof.userId);

    return {
      ...proof,
      userName: user?.name || "Unknown user",
      userEmail: user?.email || "Unknown email",
      totalWon: winnings?.totalWon || 0,
      paymentStatus: winnings?.paymentStatus || "Pending review",
    };
  });
}

export async function reviewProofSubmission(submissionId, decision) {
  const normalizedDecision = String(decision || "").toLowerCase();

  if (!["approve", "reject"].includes(normalizedDecision)) {
    const error = new Error("decision must be approve or reject.");
    error.status = 400;
    throw error;
  }

  const supabase = getSupabaseAdmin();
  const { data: proofRow, error: proofError } = await supabase
    .from("proof_submissions")
    .select("*")
    .eq("id", submissionId)
    .maybeSingle();

  normalizeMaybeSingleError(proofError);

  if (!proofRow) {
    const error = new Error("Proof submission not found.");
    error.status = 404;
    throw error;
  }

  const { data: updatedProofRow, error: updateProofError } = await supabase
    .from("proof_submissions")
    .update({
      status: normalizedDecision === "approve" ? "Approved" : "Rejected",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .select("*")
    .single();

  throwIfSupabaseError(updateProofError, "Unable to update proof review status.");

  const { data: winningsRow, error: winningsError } = await supabase
    .from("winnings")
    .select("*")
    .eq("user_id", proofRow.user_id)
    .maybeSingle();

  throwIfSupabaseError(winningsError, "Unable to load winnings after proof review.");

  const { error: updateWinningsError } = await supabase
    .from("winnings")
    .update({
      payment_status: normalizedDecision === "approve" ? "Paid" : "Rejected",
      last_updated_at: new Date().toISOString(),
    })
    .eq("user_id", proofRow.user_id);

  throwIfSupabaseError(updateWinningsError, "Unable to update winnings after proof review.");

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("email")
    .eq("id", proofRow.user_id)
    .maybeSingle();

  normalizeMaybeSingleError(userError);

  return {
    ...mapProofRow(updatedProofRow),
    userEmail: userRow?.email || "Unknown email",
    paymentStatus: winningsRow?.payment_status || (normalizedDecision === "approve" ? "Paid" : "Rejected"),
  };
}
