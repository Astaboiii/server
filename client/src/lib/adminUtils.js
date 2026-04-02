const assetBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(/\/api$/, "");

export function getProofUrl(value) {
  if (!value) {
    return "#";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${assetBaseUrl}${value}`;
}

export function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function formatDate(value) {
  return value || "-";
}

export function formatPlanLabel(value) {
  return value || "No active plan";
}
