import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SectionHeading from "../components/SectionHeading";
import { useAuth } from "../context/AuthContext";
import {
  getAdminDrawSummary,
  getAdminSummary,
  getPendingProofs,
  reviewPendingProof,
  runAdminDraw,
} from "../lib/api";

const assetBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(/\/api$/, "");

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.16 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

function getProofUrl(value) {
  if (!value) {
    return "#";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${assetBaseUrl}${value}`;
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  return value || "-";
}

function formatPlanLabel(value) {
  return value || "No active plan";
}

function getStatusTone(value) {
  const normalized = String(value || "").toLowerCase();

  if (["active", "approved", "paid", "live razorpay"].includes(normalized)) {
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

function StatusBadge({ value }) {
  return (
    <span className={`status-badge status-badge-${getStatusTone(value)}`}>
      {value || "-"}
    </span>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [latestDraw, setLatestDraw] = useState(null);
  const [draws, setDraws] = useState([]);
  const [memberRows, setMemberRows] = useState([]);
  const [subscriptionWatchlist, setSubscriptionWatchlist] = useState([]);
  const [pendingProofs, setPendingProofs] = useState([]);
  const [status, setStatus] = useState({
    loading: true,
    error: "",
    success: "",
    saving: false,
  });

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    try {
      const [summaryData, drawData, proofData] = await Promise.all([
        getAdminSummary(),
        getAdminDrawSummary(),
        getPendingProofs(),
      ]);

      setModules(summaryData.modules || []);
      setMetrics(summaryData.metrics || null);
      setLatestDraw(drawData.latestDraw || summaryData.latestDraw || null);
      setDraws(drawData.draws || []);
      setMemberRows(summaryData.memberRows || []);
      setSubscriptionWatchlist(summaryData.subscriptionWatchlist || []);
      setPendingProofs(proofData.proofs || []);
      setStatus({
        loading: false,
        error: "",
        success: "",
        saving: false,
      });
    } catch {
      setStatus({
        loading: false,
        error: "Admin data could not be loaded.",
        success: "",
        saving: false,
      });
    }
  }

  async function handleRunDraw() {
    setStatus((current) => ({
      ...current,
      saving: true,
      error: "",
      success: "",
    }));

    try {
      const response = await runAdminDraw();
      setLatestDraw(response.draw);
      await loadAdminData();
      setStatus((current) => ({
        ...current,
        saving: false,
        success: `Monthly draw ${response.draw.periodKey} completed.`,
      }));
    } catch (error) {
      setStatus((current) => ({
        ...current,
        saving: false,
        error: error.message || "Unable to run the monthly draw.",
      }));
    }
  }

  async function handleReview(submissionId, decision) {
    setStatus((current) => ({
      ...current,
      saving: true,
      error: "",
      success: "",
    }));

    try {
      await reviewPendingProof(submissionId, decision);
      await loadAdminData();
      setStatus((current) => ({
        ...current,
        saving: false,
        success: `Proof ${decision}d successfully.`,
      }));
    } catch (error) {
      setStatus((current) => ({
        ...current,
        saving: false,
        error: error.message || "Unable to review proof.",
      }));
    }
  }

  const adminPriorities = [
    {
      title: "Check the review queue",
      body: pendingProofs.length
        ? `${pendingProofs.length} proof submission${pendingProofs.length === 1 ? "" : "s"} waiting for review.`
        : "No proof submissions are waiting right now.",
    },
    {
      title: "Monitor active members",
      body: metrics
        ? `${metrics.activeSubscriptions} active subscription${metrics.activeSubscriptions === 1 ? "" : "s"} currently eligible for draws.`
        : "Member subscription metrics are loading.",
    },
    {
      title: "Watch the latest draw",
      body: latestDraw
        ? `Latest recorded draw is ${latestDraw.periodKey} with ${latestDraw.results?.filter((entry) => entry.amountWon > 0).length || 0} winners.`
        : "No draw has been recorded yet, so the next important action may be running one.",
    },
  ];

  return (
    <div className="stack-page">
      <section className="dashboard-hero admin-hero">
        <SectionHeading
          eyebrow="Admin control center"
          title={`Admin workspace${user?.name ? ` for ${user.name}` : ""}`}
          description="The operational side of the product now feels as polished as the member experience, with live metrics, draw controls, and review queues in one space."
        />
        <motion.div className="dashboard-highlight" {...reveal}>
          <span className="pill pill-soft">Operational pulse</span>
          <h3>{metrics ? `${metrics.activeSubscriptions} active subscriptions` : "Loading metrics"}</h3>
          <p>Use this workspace to protect data quality, keep payouts accountable, and run the monthly draw with confidence.</p>
        </motion.div>
      </section>

      <motion.section className="admin-rhythm-strip" {...reveal}>
        <div className="member-rhythm-copy">
          <p className="eyebrow">Control rhythm</p>
          <h3>See the platform state clearly before you act.</h3>
          <p>
            The admin experience works best when you can understand users, subscriptions,
            proofs, and draw outcomes at a glance without hunting for context.
          </p>
        </div>
        <div className="member-rhythm-pills">
          <span className="pill">Review queue</span>
          <span className="pill">Draw control</span>
          <span className="pill">Subscription watchlist</span>
          <span className="pill">Winner tracking</span>
        </div>
      </motion.section>

      <motion.section className="action-card-grid" {...reveal}>
        {adminPriorities.map((item) => (
          <article key={item.title} className="action-card action-card-admin">
            <p className="eyebrow">Admin priority</p>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </motion.section>

      {metrics ? (
        <div className="stats-grid">
          <motion.article className="stat-card stat-card-dark" {...reveal}>
            <span>Total users</span>
            <strong>{metrics.totalUsers}</strong>
            <p>All registered accounts across subscriber and admin roles.</p>
          </motion.article>
          <motion.article className="stat-card" {...reveal}>
            <span>Active subscriptions</span>
            <strong>{metrics.activeSubscriptions}</strong>
            <p>Members currently eligible for score entry and monthly draws.</p>
          </motion.article>
          <motion.article className="stat-card" {...reveal}>
            <span>Subscribers</span>
            <strong>{metrics.totalSubscribers}</strong>
            <p>Tracked separately so member growth is always visible.</p>
          </motion.article>
          <motion.article className="stat-card" {...reveal}>
            <span>Admins</span>
            <strong>{metrics.totalAdmins}</strong>
            <p>Protected users with access to control and review tools.</p>
          </motion.article>
        </div>
      ) : null}

      <motion.article className="content-card content-card-accent settings-card" {...reveal}>
        <div className="table-toolbar">
          <div>
            <p className="eyebrow">Monthly draw engine</p>
            <h3>Run and monitor the current draw</h3>
            <p>The prize split logic, rollover behavior, and winner outcomes stay visible right after execution.</p>
          </div>

          <button className="button button-primary" type="button" onClick={handleRunDraw} disabled={status.saving}>
            {status.saving ? "Running draw..." : "Run monthly draw"}
          </button>
        </div>

        {latestDraw ? (
          <div className="stats-grid stats-grid-compact">
            <article className="stat-card">
              <span>Latest draw</span>
              <strong>{latestDraw.periodKey}</strong>
              <p>Winning numbers: {latestDraw.winningNumbers?.join(", ") || "-"}</p>
            </article>
            <article className="stat-card">
              <span>Carryover out</span>
              <strong>{formatMoney(latestDraw.jackpotCarryoverOut || 0)}</strong>
              <p>{latestDraw.results?.filter((entry) => entry.amountWon > 0).length || 0} winners recorded</p>
            </article>
          </div>
        ) : null}
      </motion.article>

      <motion.article className="content-card settings-card" {...reveal}>
        <div className="table-toolbar">
          <div>
            <p className="eyebrow">Member operations</p>
            <h3>Members and account activity</h3>
          </div>
          <p className="table-caption">{memberRows.length} accounts loaded</p>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Subscription</th>
                <th>Charity</th>
                <th>Scores</th>
                <th>Total won</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {memberRows.length ? (
                memberRows.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <strong>{member.name}</strong>
                      <div className="cell-subtext">{member.email}</div>
                    </td>
                    <td><StatusBadge value={member.role} /></td>
                    <td>
                      <div>{formatPlanLabel(member.planLabel)}</div>
                      <div className="cell-subtext">{member.subscriptionStatus}</div>
                    </td>
                    <td>
                      <div>{member.charityName}</div>
                      <div className="cell-subtext">{member.contributionPercentage}% contribution</div>
                    </td>
                    <td>{member.scoreCount}</td>
                    <td>
                      <div>{formatMoney(member.totalWon)}</div>
                      <div className="cell-subtext">{member.paymentStatus}</div>
                    </td>
                    <td>{formatDate(member.createdAt?.slice?.(0, 10) || member.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="table-empty">No member records yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.article>

      <motion.article className="content-card settings-card" {...reveal}>
        <div className="table-toolbar">
          <div>
            <p className="eyebrow">Subscription watchlist</p>
            <h3>Payment mode, renewal state, and payout visibility</h3>
          </div>
          <p className="table-caption">{subscriptionWatchlist.length} subscriber rows</p>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subscriber</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Renewal</th>
                <th>Mode</th>
                <th>Payout state</th>
              </tr>
            </thead>
            <tbody>
              {subscriptionWatchlist.length ? (
                subscriptionWatchlist.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      <div className="cell-subtext">{row.email}</div>
                    </td>
                    <td>{formatPlanLabel(row.planLabel)}</td>
                    <td>
                      <StatusBadge value={row.subscriptionStatus} />
                      {row.cancelAtPeriodEnd ? <div className="cell-subtext">Cancels at period end</div> : null}
                    </td>
                    <td>{formatDate(row.renewalDate)}</td>
                    <td><StatusBadge value={row.paymentMode} /></td>
                    <td>
                      <div>{row.paymentStatus}</div>
                      <div className="cell-subtext">{formatMoney(row.totalWon)}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="table-empty">No subscription records yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.article>

      <motion.article className="content-card settings-card" {...reveal}>
        <div className="table-toolbar">
          <div>
            <p className="eyebrow">Winner proof review</p>
            <h3>Pending submissions queue</h3>
          </div>
          <p className="table-caption">{pendingProofs.length} awaiting review</p>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Proof</th>
                <th>Winnings</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingProofs.length ? (
                pendingProofs.map((proof) => (
                  <tr key={proof.id}>
                    <td>
                      <strong>{proof.userName}</strong>
                      <div className="cell-subtext">{proof.userEmail}</div>
                    </td>
                    <td>
                      <a href={getProofUrl(proof.publicUrl)} target="_blank" rel="noreferrer">
                        View uploaded proof
                      </a>
                      <div className="cell-subtext">{proof.originalFileName}</div>
                    </td>
                    <td>
                      <div>{formatMoney(proof.totalWon)}</div>
                      <div className="cell-subtext">{proof.paymentStatus}</div>
                    </td>
                    <td>{formatDate(proof.createdAt?.slice?.(0, 10) || proof.createdAt)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="button button-primary button-inline"
                          type="button"
                          onClick={() => handleReview(proof.id, "approve")}
                          disabled={status.saving}
                        >
                          Approve
                        </button>
                        <button
                          className="button button-secondary button-inline"
                          type="button"
                          onClick={() => handleReview(proof.id, "reject")}
                          disabled={status.saving}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="table-empty">No pending proof submissions.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.article>

      <div className="panel-grid">
        <article className="content-card settings-card">
          <div className="table-toolbar">
            <div>
              <p className="eyebrow">Draw history</p>
              <h3>Recorded monthly draw runs</h3>
            </div>
            <p className="table-caption">{draws.length} completed draws</p>
          </div>

          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Winning numbers</th>
                  <th>Prize pool</th>
                  <th>Carryover out</th>
                  <th>Winners</th>
                </tr>
              </thead>
              <tbody>
                {draws.length ? (
                  draws.map((draw) => (
                    <tr key={draw.id}>
                      <td>{draw.periodKey}</td>
                      <td>{draw.winningNumbers.join(", ")}</td>
                      <td>{formatMoney(draw.basePrizePool)}</td>
                      <td>{formatMoney(draw.jackpotCarryoverOut)}</td>
                      <td>{draw.totalWinners}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="table-empty">No draws have been run yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="content-card settings-card">
          <div className="table-toolbar">
            <div>
              <p className="eyebrow">Latest winners</p>
              <h3>Most recent draw payouts</h3>
            </div>
            <p className="table-caption">
              {latestDraw?.results?.filter((entry) => entry.amountWon > 0).length || 0} paid positions
            </p>
          </div>

          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Winner</th>
                  <th>Match count</th>
                  <th>Ticket</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {latestDraw?.results?.filter((entry) => entry.amountWon > 0).length ? (
                  latestDraw.results
                    .filter((entry) => entry.amountWon > 0)
                    .map((result) => (
                      <tr key={`${result.userId}-${result.matchCount}-${result.amountWon}`}>
                        <td>
                          <strong>{result.userName}</strong>
                          <div className="cell-subtext">{result.userEmail}</div>
                        </td>
                        <td>{result.matchCount}</td>
                        <td>{result.ticketNumbers.join(", ")}</td>
                        <td>{formatMoney(result.amountWon)}</td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan="4" className="table-empty">No winners recorded on the latest draw yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <section>
        <SectionHeading
          eyebrow="Admin modules"
          title="Every control surface still maps back to the PRD"
          description="The interface feels richer now, but the underlying responsibilities stay clear and practical."
        />
        <div className="module-grid">
          {modules.map((module) => (
            <article key={module.title} className="content-card">
              <h3>{module.title}</h3>
              <p>{module.description}</p>
            </article>
          ))}
        </div>
      </section>

      {status.success ? <p className="status-text status-text-success">{status.success}</p> : null}
      {status.loading ? <p className="status-text">Loading admin data...</p> : null}
      {status.error ? <p className="status-text status-text-error">{status.error}</p> : null}
    </div>
  );
}
