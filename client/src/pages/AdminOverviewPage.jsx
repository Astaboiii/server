import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import SectionHeading from "../components/SectionHeading";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import { formatMoney } from "../lib/adminUtils";
import { getAdminDrawSummary, getAdminSummary, getPendingProofs, runAdminDraw } from "../lib/api";

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.16 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [latestDraw, setLatestDraw] = useState(null);
  const [pendingProofCount, setPendingProofCount] = useState(0);
  const [status, setStatus] = useState({
    loading: true,
    saving: false,
    error: "",
    success: "",
  });

  useEffect(() => {
    loadOverview();
  }, []);

  async function loadOverview() {
    try {
      const [summaryData, drawData, proofData] = await Promise.all([
        getAdminSummary(),
        getAdminDrawSummary(),
        getPendingProofs(),
      ]);

      setModules(summaryData.modules || []);
      setMetrics(summaryData.metrics || null);
      setLatestDraw(drawData.latestDraw || summaryData.latestDraw || null);
      setPendingProofCount((proofData.proofs || []).length);
      setStatus({
        loading: false,
        saving: false,
        error: "",
        success: "",
      });
    } catch {
      setStatus({
        loading: false,
        saving: false,
        error: "Admin overview could not be loaded.",
        success: "",
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
      await loadOverview();
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

  const adminPriorities = [
    {
      title: "Review proofs first",
      body: pendingProofCount
        ? `${pendingProofCount} proof submission${pendingProofCount === 1 ? "" : "s"} waiting in the queue.`
        : "The proof queue is clear right now.",
    },
    {
      title: "Watch subscription health",
      body: metrics
        ? `${metrics.activeSubscriptions} active memberships and ${metrics.totalSubscribers} subscriber account${metrics.totalSubscribers === 1 ? "" : "s"} on platform.`
        : "Subscription metrics are still loading.",
    },
    {
      title: "Check draw readiness",
      body: latestDraw
        ? `Latest draw ${latestDraw.periodKey} is recorded with ${latestDraw.results?.filter((entry) => entry.amountWon > 0).length || 0} winning positions.`
        : "No draw is recorded yet, so the next action may be running the first one.",
    },
  ];

  return (
    <div className="stack-page">
      <section className="dashboard-hero admin-hero">
        <SectionHeading
          eyebrow="Admin control center"
          title={`Admin workspace${user?.name ? ` for ${user.name}` : ""}`}
          description="Start here when you log in as an administrator. This screen is for fast awareness, not deep table work."
        />
        <motion.div className="dashboard-highlight" {...reveal}>
          <span className="pill pill-soft">Platform pulse</span>
          <h3>{metrics ? `${metrics.activeSubscriptions} active subscriptions` : "Loading operational state"}</h3>
          <p>See the membership base, review pressure, and draw health before you step into detailed admin sections.</p>
        </motion.div>
      </section>

      <motion.section className="admin-rhythm-strip" {...reveal}>
        <div className="member-rhythm-copy">
          <p className="eyebrow">Start here</p>
          <h3>Use overview for awareness, then move into focused admin pages.</h3>
          <p>
            Members, draws, and proof reviews now have their own dedicated screens so this page can stay clean and strategic.
          </p>
        </div>
        <div className="member-rhythm-pills">
          <span className="pill">Overview</span>
          <span className="pill">Members</span>
          <span className="pill">Draws</span>
          <span className="pill">Proof review</span>
        </div>
      </motion.section>

      <motion.section className="action-card-grid" {...reveal}>
        {adminPriorities.map((item) => (
          <article key={item.title} className="action-card action-card-admin">
            <p className="eyebrow">Priority</p>
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
            <p>Every account registered across subscriber and admin roles.</p>
          </motion.article>
          <motion.article className="stat-card" {...reveal}>
            <span>Active subscriptions</span>
            <strong>{metrics.activeSubscriptions}</strong>
            <p>Eligible members for score entry, charity contribution, and monthly draws.</p>
          </motion.article>
          <motion.article className="stat-card" {...reveal}>
            <span>Pending proofs</span>
            <strong>{pendingProofCount}</strong>
            <p>Submissions waiting for manual verification before payout is marked paid.</p>
          </motion.article>
          <motion.article className="stat-card" {...reveal}>
            <span>Admins</span>
            <strong>{metrics.totalAdmins}</strong>
            <p>Protected control accounts with access to the operational workspace.</p>
          </motion.article>
        </div>
      ) : null}

      <motion.article className="content-card content-card-accent settings-card" {...reveal}>
        <div className="table-toolbar">
          <div>
            <p className="eyebrow">Monthly draw engine</p>
            <h3>Run the next draw from one clear decision point</h3>
            <p>Once you are happy with member data and proof review status, trigger the monthly draw here.</p>
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
              <p>{latestDraw.results?.filter((entry) => entry.amountWon > 0).length || 0} winning positions recorded</p>
            </article>
          </div>
        ) : null}
      </motion.article>

      <div className="panel-grid">
        <motion.article className="content-card settings-card" {...reveal}>
          <div className="table-toolbar">
            <div>
              <p className="eyebrow">Navigation guide</p>
              <h3>What each admin page is for</h3>
            </div>
          </div>

          <div className="admin-guide-grid">
            <article className="feature-card feature-card-charity">
              <p className="eyebrow">Members</p>
              <h3>Account and subscription visibility</h3>
              <p>Review who joined, which charity they selected, how many scores they have logged, and how much they have won.</p>
            </article>
            <article className="feature-card feature-card-charity">
              <p className="eyebrow">Draws</p>
              <h3>History and winner outcomes</h3>
              <p>See completed draw periods, winning numbers, carryover values, and the latest winning tickets in one place.</p>
            </article>
            <article className="feature-card feature-card-charity">
              <p className="eyebrow">Charities</p>
              <h3>Partner catalog management</h3>
              <p>Edit charity profiles, contribution share, and mission details so member impact stays aligned with platform goals.</p>
            </article>
            <article className="feature-card feature-card-charity">
              <p className="eyebrow">Proof review</p>
              <h3>Verification workflow</h3>
              <p>Approve or reject proof submissions, inspect uploaded evidence, and keep payout states accountable.</p>
            </article>
            <article className="feature-card feature-card-charity">
              <p className="eyebrow">Reports</p>
              <h3>Platform analytics</h3>
              <p>Track charity contributions, donor behavior, subscriber volume, and draw outcomes in an executive summary.</p>
              <Link className="button button-primary button-small" to="/admin/reports">
                View reports
              </Link>
            </article>
          </div>
        </motion.article>

        <motion.article className="content-card settings-card" {...reveal}>
          <div className="table-toolbar">
            <div>
              <p className="eyebrow">Current focus</p>
              <h3>Operational status summary</h3>
            </div>
          </div>

          <div className="admin-focus-list">
            <div className="admin-focus-item">
              <span className="pill pill-soft">Proof queue</span>
              <strong>{pendingProofCount} pending</strong>
            </div>
            <div className="admin-focus-item">
              <span className="pill pill-soft">Latest draw</span>
              <strong>{latestDraw?.periodKey || "Not run yet"}</strong>
            </div>
            <div className="admin-focus-item">
              <span className="pill pill-soft">System mode</span>
              <strong><StatusBadge value="Admin live" /></strong>
            </div>
          </div>
        </motion.article>
      </div>

      <section>
        <SectionHeading
          eyebrow="Admin modules"
          title="Every control surface still maps back to the PRD"
          description="The structure is now cleaner for real use: a strategic overview here, and dedicated pages for heavier operations."
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
      {status.loading ? <p className="status-text">Loading admin overview...</p> : null}
      {status.error ? <p className="status-text status-text-error">{status.error}</p> : null}
    </div>
  );
}
