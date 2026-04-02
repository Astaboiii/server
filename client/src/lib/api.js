const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function getStoredToken() {
  const raw = window.localStorage.getItem("drive-for-good-auth");

  if (!raw) {
    return "";
  }

  try {
    return JSON.parse(raw).token || "";
  } catch {
    return "";
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
    method: options.method || "GET",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export function getPlatformOverview() {
  return request("/platform/overview");
}

export function getCharities() {
  return request("/charities");
}

export function getPlans() {
  return request("/plans");
}

export function getDashboardSummary() {
  return request("/dashboard/summary", { token: getStoredToken() });
}

export function getAdminSummary() {
  return request("/admin/summary", { token: getStoredToken() });
}

export function getAdminReports() {
  return request("/admin/reports", { token: getStoredToken() });
}

export function getAdminUser(userId) {
  return request(`/admin/users/${userId}`, { token: getStoredToken() });
}

export function getCharityById(charityId) {
  return request(`/charities/${charityId}`);
}

export function updateAdminUser(userId, payload) {
  return request(`/admin/users/${userId}`, {
    method: "PATCH",
    token: getStoredToken(),
    body: payload,
  });
}

export function signupUser(payload) {
  return request("/auth/signup", {
    method: "POST",
    body: payload,
  });
}

export function loginUser(payload) {
  return request("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function getCurrentUser(token) {
  return request("/auth/me", {
    token,
  });
}

export function updateDashboardCharitySelection(charityId, extraDonationAmount = 0, contributionPercentage = null) {
  const body = { charityId, extraDonationAmount };

  if (contributionPercentage !== null && typeof contributionPercentage !== "undefined") {
    body.contributionPercentage = contributionPercentage;
  }

  return request("/dashboard/charity", {
    method: "PATCH",
    token: getStoredToken(),
    body,
  });
}

export function getCurrentSubscription() {
  return request("/subscription/current", {
    token: getStoredToken(),
  });
}

export function createRazorpayCheckout(planId) {
  return request("/subscription/checkout", {
    method: "POST",
    token: getStoredToken(),
    body: { planId },
  });
}

export function verifyRazorpaySubscription(razorpaySubscriptionId) {
  return request("/subscription/verify", {
    method: "POST",
    token: getStoredToken(),
    body: {
      razorpay_subscription_id: razorpaySubscriptionId,
    },
  });
}

export function cancelCurrentSubscription() {
  return request("/subscription/cancel", {
    method: "POST",
    token: getStoredToken(),
  });
}

export function getScores() {
  return request("/scores", {
    token: getStoredToken(),
  });
}

export function createScore(payload) {
  return request("/scores", {
    method: "POST",
    token: getStoredToken(),
    body: payload,
  });
}

export function updateScore(scoreId, payload) {
  return request(`/scores/${scoreId}`, {
    method: "PATCH",
    token: getStoredToken(),
    body: payload,
  });
}

export function getAdminDrawSummary() {
  return request("/admin/draws", {
    token: getStoredToken(),
  });
}

export function runAdminDraw(options = {}) {
  return request("/admin/draws/run", {
    method: "POST",
    token: getStoredToken(),
    body: options,
  });
}

export function getAdminCharities() {
  return request("/admin/charities", {
    token: getStoredToken(),
  });
}

export function createAdminCharity(payload) {
  return request("/admin/charities", {
    method: "POST",
    token: getStoredToken(),
    body: payload,
  });
}

export function updateAdminCharity(charityId, payload) {
  return request(`/admin/charities/${charityId}`, {
    method: "PATCH",
    token: getStoredToken(),
    body: payload,
  });
}

export function deleteAdminCharity(charityId) {
  return request(`/admin/charities/${charityId}`, {
    method: "DELETE",
    token: getStoredToken(),
  });
}

export function getWinningsSummary() {
  return request("/winnings/summary", {
    token: getStoredToken(),
  });
}

export function submitWinningsProof(payload) {
  return request("/winnings/proof", {
    method: "POST",
    token: getStoredToken(),
    body: payload,
  });
}

export function getPendingProofs() {
  return request("/admin/winners/pending", {
    token: getStoredToken(),
  });
}

export function reviewPendingProof(submissionId, decision) {
  return request(`/admin/winners/${submissionId}/review`, {
    method: "POST",
    token: getStoredToken(),
    body: { decision },
  });
}
