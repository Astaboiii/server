import { randomUUID } from "crypto";
import { plans } from "../data/platformData.js";
import {
  getSupabaseAdmin,
  normalizeMaybeSingleError,
  throwIfSupabaseError,
} from "../lib/supabase.js";
import { getRazorpay, getRazorpayPlanId } from "../lib/razorpay.js";
import { getUserDrawSummary } from "./drawService.js";
import { getAllCharities, getCharityById } from "./charityService.js";

function formatDate(dateString) {
  return dateString ? new Date(dateString).toISOString().slice(0, 10) : null;
}

function getPlanLabel(planId) {
  const plan = plans.find((entry) => entry.id === planId);
  return plan ? `${plan.name} plan` : "No active plan";
}

function mapRazorpayStatusToLocalStatus(status) {
  if (["active", "authenticated"].includes(status)) {
    return "active";
  }

  if (["pending", "halted"].includes(status)) {
    return "lapsed";
  }

  if (["cancelled", "completed", "expired"].includes(status)) {
    return "cancelled";
  }

  return "inactive";
}

function getNormalizedStatus(subscription) {
  if (!subscription) {
    return "inactive";
  }

  if (subscription.status === "active" && subscription.renewalDate) {
    const renewalDate = new Date(subscription.renewalDate);

    if (renewalDate.getTime() < Date.now()) {
      return "lapsed";
    }
  }

  return subscription.status;
}

function mapSubscriptionRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    razorpayPlanId: row.razorpay_plan_id,
    razorpaySubscriptionId: row.razorpay_subscription_id,
    razorpayPaymentId: row.razorpay_payment_id,
    status: row.status,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    renewalDate: row.renewal_date,
    startedAt: row.started_at,
    canceledAt: row.cancelled_at,
  };
}

function mapCharitySelectionRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    charityId: row.charity_id,
    contributionPercentage: Number(row.contribution_percentage || 0),
    extraDonationAmount: Number(row.extra_donation_amount || 0),
    updatedAt: row.updated_at,
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

function getSubscriptionTotalCount(planId) {
  return planId === "yearly" ? 25 : 120;
}

function getRenewalDateForPlan(planId) {
  const renewalDate = new Date();

  if (planId === "yearly") {
    renewalDate.setFullYear(renewalDate.getFullYear() + 1);
  } else {
    renewalDate.setMonth(renewalDate.getMonth() + 1);
  }

  return renewalDate.toISOString();
}

async function activateDemoSubscription(userId, planId) {
  const now = new Date().toISOString();
  const updated = await updateSubscriptionRowByUserId(userId, {
    plan_id: planId,
    razorpay_plan_id: null,
    razorpay_subscription_id: `demo_${randomUUID()}`,
    razorpay_payment_id: null,
    status: "active",
    cancel_at_period_end: false,
    renewal_date: getRenewalDateForPlan(planId),
    started_at: now,
    cancelled_at: null,
  });

  return {
    ...updated,
    status: getNormalizedStatus(updated),
    planLabel: getPlanLabel(updated?.planId),
    renewalDate: formatDate(updated?.renewalDate),
  };
}

async function getUserIdentity(userId) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name")
    .eq("id", userId)
    .maybeSingle();

  normalizeMaybeSingleError(error);
  return data || null;
}

async function getSubscriptionRow(userId) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  normalizeMaybeSingleError(error);
  return data || null;
}

async function getSubscriptionRowByRazorpayId(razorpaySubscriptionId) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("razorpay_subscription_id", razorpaySubscriptionId)
    .maybeSingle();

  normalizeMaybeSingleError(error);
  return data || null;
}

async function getCharitySelectionRow(userId) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("charity_selections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  normalizeMaybeSingleError(error);
  return data || null;
}

async function getWinningsRow(userId) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("winnings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  normalizeMaybeSingleError(error);
  return data || null;
}

async function updateSubscriptionRowByUserId(userId, updates) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("subscriptions")
    .update(updates)
    .eq("user_id", userId)
    .select("*")
    .single();

  throwIfSupabaseError(error, "Unable to update the subscription.");
  return mapSubscriptionRow(data);
}

export async function ensureMemberState(userId) {
  const supabase = getSupabaseAdmin();
  const [subscription, charitySelection, winnings] = await Promise.all([
    getSubscriptionRow(userId),
    getCharitySelectionRow(userId),
    getWinningsRow(userId),
  ]);

  if (!subscription) {
    const { error } = await supabase.from("subscriptions").insert({
      id: randomUUID(),
      user_id: userId,
      plan_id: null,
      razorpay_plan_id: null,
      razorpay_subscription_id: null,
      razorpay_payment_id: null,
      status: "inactive",
      cancel_at_period_end: false,
      renewal_date: null,
      started_at: null,
      cancelled_at: null,
    });

    throwIfSupabaseError(error, "Unable to create the default subscription state.");
  }

  if (!charitySelection) {
    const availableCharities = await getAllCharities();
    const defaultCharity = availableCharities[0] || { id: null, contributionPercentage: 10 };

    const { error } = await supabase.from("charity_selections").insert({
      id: randomUUID(),
      user_id: userId,
      charity_id: defaultCharity.id,
      contribution_percentage: defaultCharity.contributionPercentage,
      extra_donation_amount: 0,
      updated_at: new Date().toISOString(),
    });

    throwIfSupabaseError(error, "Unable to create the default charity selection.");
  }

  if (!winnings) {
    const { error } = await supabase.from("winnings").insert({
      id: randomUUID(),
      user_id: userId,
      total_won: 0,
      payment_status: "No winnings yet",
      last_updated_at: new Date().toISOString(),
    });

    throwIfSupabaseError(error, "Unable to create the default winnings state.");
  }
}

export async function ensureAllUsersHaveMemberState() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("users").select("id");

  throwIfSupabaseError(error, "Unable to list users for member-state initialization.");

  for (const user of data || []) {
    await ensureMemberState(user.id);
  }
}

export async function getDashboardSummaryForUser(userId) {
  await ensureMemberState(userId);

  const [subscriptionRow, charitySelectionRow, winningsRow] = await Promise.all([
    getSubscriptionRow(userId),
    getCharitySelectionRow(userId),
    getWinningsRow(userId),
  ]);

  const subscription = mapSubscriptionRow(subscriptionRow);
  const charitySelection = mapCharitySelectionRow(charitySelectionRow);
  const winnings = mapWinningsRow(winningsRow);
  const availableCharities = await getAllCharities();
  const charity = availableCharities.find((entry) => entry.id === charitySelection?.charityId) || null;
  const subscriptionStatus = getNormalizedStatus(subscription);
  const participation = await getUserDrawSummary(userId, subscriptionStatus);

  return {
    summary: {
      subscription: {
        status: subscriptionStatus,
        planLabel: getPlanLabel(subscription?.planId),
        renewalDate: formatDate(subscription?.renewalDate),
      },
      charity: {
        charityId: charity?.id || null,
        charityName: charity?.name || "Not selected",
        contributionPercentage: charitySelection?.contributionPercentage || 0,
        extraDonationAmount: charitySelection?.extraDonationAmount || 0,
      },
      participation: {
        drawsEntered: participation.drawsEntered,
        upcomingDraws: participation.upcomingDraws,
      },
      winnings: {
        totalWon: winnings?.totalWon || 0,
        paymentStatus: winnings?.paymentStatus || "No winnings yet",
      },
    },
    charities: availableCharities,
  };
}

function normalizeCharityContributionPercentage(value, defaultValue) {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  const numeric = Number(value);

  if (Number.isNaN(numeric) || numeric < 10 || numeric > 100) {
    const error = new Error("Contribution percentage must be a number between 10 and 100.");
    error.status = 400;
    throw error;
  }

  return numeric;
}

export async function updateCharitySelection(userId, charityId, donationAmount = 0, contributionPercentage = null) {
  const charity = await getCharityById(charityId);

  if (!charity) {
    const error = new Error("Selected charity does not exist.");
    error.status = 404;
    throw error;
  }

  const normalizedContribution = normalizeCharityContributionPercentage(contributionPercentage, charity.contributionPercentage);
  const normalizedDonation = Number(donationAmount || 0);

  await ensureMemberState(userId);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("charity_selections")
    .update({
      charity_id: charity.id,
      contribution_percentage: normalizedContribution,
      extra_donation_amount: normalizedDonation,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  throwIfSupabaseError(error, "Unable to update the charity selection.");

  return {
    charityId: charity.id,
    charityName: charity.name,
    contributionPercentage: normalizedContribution,
    extraDonationAmount: normalizedDonation,
  };
}

export async function getSubscriptionForUser(userId) {
  await ensureMemberState(userId);
  const subscription = mapSubscriptionRow(await getSubscriptionRow(userId));

  return {
    ...subscription,
    status: getNormalizedStatus(subscription),
    planLabel: getPlanLabel(subscription?.planId),
    renewalDate: formatDate(subscription?.renewalDate),
  };
}

export async function hasActiveSubscription(userId) {
  const subscription = await getSubscriptionForUser(userId);
  return subscription.status === "active";
}

export async function createRazorpayCheckout(userId, planId) {
  const plan = plans.find((entry) => entry.id === planId);

  if (!plan) {
    const error = new Error("Selected plan does not exist.");
    error.status = 404;
    throw error;
  }

  const razorpayPlanId = getRazorpayPlanId(planId);

  await ensureMemberState(userId);

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET || !razorpayPlanId) {
    const subscription = await activateDemoSubscription(userId, planId);

    return {
      mode: "demo",
      planId,
      subscription,
      message:
        "Demo subscription activated because Razorpay checkout is not fully configured yet.",
    };
  }

  const razorpay = getRazorpay();
  const user = await getUserIdentity(userId);

  if (!user) {
    const error = new Error("Authenticated user could not be found.");
    error.status = 404;
    throw error;
  }

  const razorpaySubscription = await razorpay.subscriptions.create({
    plan_id: razorpayPlanId,
    total_count: getSubscriptionTotalCount(planId),
    customer_notify: 1,
    notes: {
      userId,
      planId,
    },
  });

  await updateSubscriptionRowByUserId(userId, {
    plan_id: planId,
    razorpay_plan_id: razorpayPlanId,
    razorpay_subscription_id: razorpaySubscription.id,
    status: mapRazorpayStatusToLocalStatus(razorpaySubscription.status),
    cancel_at_period_end: false,
  });

  return {
    mode: "razorpay",
    id: razorpaySubscription.id,
    status: razorpaySubscription.status,
    shortUrl: razorpaySubscription.short_url || null,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    planId,
    user: {
      name: user.name,
      email: user.email,
    },
  };
}

export async function refreshRazorpaySubscriptionForUser(userId, razorpaySubscriptionId) {
  await ensureMemberState(userId);
  const subscription = mapSubscriptionRow(await getSubscriptionRow(userId));

  if (!subscription?.razorpaySubscriptionId || subscription.razorpaySubscriptionId !== razorpaySubscriptionId) {
    const error = new Error("Razorpay subscription does not belong to the authenticated user.");
    error.status = 403;
    throw error;
  }

  const razorpay = getRazorpay();
  const latest = await razorpay.subscriptions.fetch(razorpaySubscriptionId);
  const updated = await syncSubscriptionFromRazorpay(latest, userId);

  return {
    ...updated,
    status: getNormalizedStatus(updated),
    planLabel: getPlanLabel(updated?.planId),
    renewalDate: formatDate(updated?.renewalDate),
  };
}

export async function cancelSubscription(userId) {
  await ensureMemberState(userId);
  const subscription = mapSubscriptionRow(await getSubscriptionRow(userId));

  if (
    subscription?.razorpaySubscriptionId &&
    !String(subscription.razorpaySubscriptionId).startsWith("demo_")
  ) {
    const razorpay = getRazorpay();
    const razorpaySubscription = await razorpay.subscriptions.cancel(
      subscription.razorpaySubscriptionId,
      true
    );

    const updated = await syncSubscriptionFromRazorpay(razorpaySubscription, userId);

    return {
      ...updated,
      status: getNormalizedStatus(updated),
      planLabel: getPlanLabel(updated?.planId),
      renewalDate: formatDate(updated?.renewalDate),
    };
  }

  const updated = await updateSubscriptionRowByUserId(userId, {
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
    renewal_date: null,
    cancel_at_period_end: false,
  });

  return {
    ...updated,
    status: getNormalizedStatus(updated),
    planLabel: getPlanLabel(updated.planId),
    renewalDate: formatDate(updated.renewalDate),
  };
}

export async function syncSubscriptionFromRazorpay(razorpaySubscription, fallbackUserId = "") {
  let subscriptionRow = null;

  if (razorpaySubscription.id) {
    subscriptionRow = await getSubscriptionRowByRazorpayId(razorpaySubscription.id);
  }

  const userId =
    subscriptionRow?.user_id ||
    razorpaySubscription.notes?.userId ||
    fallbackUserId ||
    "";

  if (!subscriptionRow && userId) {
    await ensureMemberState(userId);
    subscriptionRow = await getSubscriptionRow(userId);
  }

  if (!subscriptionRow || !userId) {
    return null;
  }

  const currentEnd = razorpaySubscription.current_end
    ? new Date(razorpaySubscription.current_end * 1000).toISOString()
    : null;
  const paidCount = Number(razorpaySubscription.paid_count || 0);
  const totalCount = Number(razorpaySubscription.total_count || 0);
  const completed = totalCount > 0 && paidCount >= totalCount;
  const status = completed
    ? "cancelled"
    : mapRazorpayStatusToLocalStatus(razorpaySubscription.status);

  const updated = await updateSubscriptionRowByUserId(userId, {
    plan_id: razorpaySubscription.notes?.planId || subscriptionRow.plan_id,
    razorpay_plan_id: razorpaySubscription.plan_id || subscriptionRow.razorpay_plan_id,
    razorpay_subscription_id: razorpaySubscription.id,
    razorpay_payment_id: razorpaySubscription.charge_at ? subscriptionRow.razorpay_payment_id : subscriptionRow.razorpay_payment_id,
    status,
    cancel_at_period_end: Boolean(razorpaySubscription.cancel_at_cycle_end),
    renewal_date: currentEnd,
    started_at:
      subscriptionRow.started_at ||
      (razorpaySubscription.start_at
        ? new Date(razorpaySubscription.start_at * 1000).toISOString()
        : new Date().toISOString()),
    cancelled_at:
      ["cancelled", "completed", "expired"].includes(String(razorpaySubscription.status || ""))
        ? new Date().toISOString()
        : null,
  });

  return updated;
}

export async function getAdminSummaryData() {
  const supabase = getSupabaseAdmin();
  const [
    { count: totalUsers, error: usersError },
    { count: totalSubscribers, error: subscribersError },
    { count: totalAdmins, error: adminsError },
    { data: userRows, error: userRowsError },
    { data: subscriptionRows, error: subscriptionsError },
    { data: charitySelectionRows, error: charitySelectionsError },
    { data: winningsRows, error: winningsRowsError },
    { data: scoreRows, error: scoreRowsError },
    { data: latestDrawRow, error: latestDrawError },
  ] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "subscriber"),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "admin"),
    supabase.from("users").select("id, name, email, role, created_at").order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("*"),
    supabase.from("charity_selections").select("*"),
    supabase.from("winnings").select("*"),
    supabase.from("scores").select("user_id"),
    supabase.from("draws").select("*").order("period_key", { ascending: false }).limit(1).maybeSingle(),
  ]);

  throwIfSupabaseError(usersError, "Unable to count users.");
  throwIfSupabaseError(subscribersError, "Unable to count subscribers.");
  throwIfSupabaseError(adminsError, "Unable to count admins.");
  throwIfSupabaseError(userRowsError, "Unable to load admin member rows.");
  throwIfSupabaseError(subscriptionsError, "Unable to load subscriptions.");
  throwIfSupabaseError(charitySelectionsError, "Unable to load charity selections.");
  throwIfSupabaseError(winningsRowsError, "Unable to load winnings.");
  throwIfSupabaseError(scoreRowsError, "Unable to load score counts.");
  normalizeMaybeSingleError(latestDrawError);

  const mappedSubscriptions = (subscriptionRows || [])
    .map(mapSubscriptionRow)
    .filter(Boolean);
  const activeSubscriptions = mappedSubscriptions.filter(
    (entry) => getNormalizedStatus(entry) === "active"
  ).length;
  const charitySelectionsByUserId = new Map(
    (charitySelectionRows || []).map((row) => [row.user_id, mapCharitySelectionRow(row)])
  );
  const winningsByUserId = new Map((winningsRows || []).map((row) => [row.user_id, mapWinningsRow(row)]));
  const subscriptionsByUserId = new Map(mappedSubscriptions.map((row) => [row.userId, row]));
  const scoreCountsByUserId = new Map();

  const availableCharities = await getAllCharities();

  for (const row of scoreRows || []) {
    scoreCountsByUserId.set(row.user_id, (scoreCountsByUserId.get(row.user_id) || 0) + 1);
  }

  const memberRows = (userRows || []).map((row) => {
    const user = mapUserRow(row);
    const subscription = subscriptionsByUserId.get(user.id) || null;
    const charitySelection = charitySelectionsByUserId.get(user.id) || null;
    const charity = availableCharities.find((entry) => entry.id === charitySelection?.charityId) || null;
    const winnings = winningsByUserId.get(user.id) || null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      scoreCount: scoreCountsByUserId.get(user.id) || 0,
      charityName: charity?.name || "Not selected",
      contributionPercentage: charitySelection?.contributionPercentage || 0,
      totalWon: winnings?.totalWon || 0,
      paymentStatus: winnings?.paymentStatus || "No winnings yet",
      subscriptionStatus: getNormalizedStatus(subscription),
      planId: subscription?.planId || null,
      planLabel: getPlanLabel(subscription?.planId),
      renewalDate: formatDate(subscription?.renewalDate),
      cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
      paymentMode:
        subscription?.razorpaySubscriptionId &&
        !String(subscription.razorpaySubscriptionId).startsWith("demo_")
          ? "Live Razorpay"
          : subscription?.planId
            ? "Demo"
            : "Not started",
    };
  });

  const subscriptionWatchlist = memberRows
    .filter((row) => row.role === "subscriber")
    .map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      planLabel: row.planLabel,
      subscriptionStatus: row.subscriptionStatus,
      renewalDate: row.renewalDate,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      paymentMode: row.paymentMode,
      totalWon: row.totalWon,
      paymentStatus: row.paymentStatus,
    }));

  let latestDraw = null;

  if (latestDrawRow) {
    const { count: winnersCount, error: winnersError } = await supabase
      .from("draw_results")
      .select("id", { count: "exact", head: true })
      .eq("draw_id", latestDrawRow.id)
      .gt("amount_won", 0);

    throwIfSupabaseError(winnersError, "Unable to count winners for the latest draw.");

    latestDraw = {
      periodKey: latestDrawRow.period_key,
      winningNumbers: latestDrawRow.winning_numbers,
      totalWinners: winnersCount || 0,
    };
  }

  return {
    metrics: {
      totalUsers: totalUsers || 0,
      totalSubscribers: totalSubscribers || 0,
      totalAdmins: totalAdmins || 0,
      activeSubscriptions,
    },
    latestDraw,
    memberRows,
    subscriptionWatchlist,
  };
}
