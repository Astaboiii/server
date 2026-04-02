function getStatusTone(value) {
  const normalized = String(value || "").toLowerCase();

  if (["active", "approved", "paid", "live razorpay", "admin", "subscriber"].includes(normalized)) {
    return "success";
  }

  if (["pending", "pending review", "lapsed"].includes(normalized)) {
    return "warning";
  }

  if (["rejected", "cancelled", "inactive", "not started"].includes(normalized)) {
    return "neutral";
  }

  return "accent";
}

export default function StatusBadge({ value }) {
  return (
    <span className={`status-badge status-badge-${getStatusTone(value)}`}>
      {value || "-"}
    </span>
  );
}
