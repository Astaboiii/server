export function sendEmail({ to, subject, body }) {
  const from = process.env.EMAIL_FROM || "no-reply@driveforgood.example";
  const message = {
    from,
    to,
    subject,
    body,
    sentAt: new Date().toISOString(),
  };

  if (process.env.EMAIL_ENABLED === "true") {
    console.log("[notification] sending email", message);
    // Real email integration can be added here.
    return true;
  }

  console.log("[notification] email disabled, queued for review", message);
  return false;
}
