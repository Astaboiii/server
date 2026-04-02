import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SectionHeading from "../components/SectionHeading";
import StatusBadge from "../components/StatusBadge";
import { formatDate, formatMoney, formatPlanLabel } from "../lib/adminUtils";
import { getAdminSummary, getAdminUser, updateAdminUser, updateScore } from "../lib/api";

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.16 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

export default function AdminMembersPage() {
  const [metrics, setMetrics] = useState(null);
  const [memberRows, setMemberRows] = useState([]);
  const [subscriptionWatchlist, setSubscriptionWatchlist] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberEdit, setMemberEdit] = useState({ name: "", email: "", role: "member" });
  const [memberStatus, setMemberStatus] = useState({ loading: false, error: "", success: "" });
  const [scoreForm, setScoreForm] = useState({ courseName: "", grossScore: "", playedAt: "" });
  const [editingScoreId, setEditingScoreId] = useState("");
  const [scoreStatus, setScoreStatus] = useState({ loading: false, error: "", success: "" });
  const [status, setStatus] = useState({
    loading: true,
    error: "",
  });

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      const summaryData = await getAdminSummary();
      setMetrics(summaryData.metrics || null);
      setMemberRows(summaryData.memberRows || []);
      setSubscriptionWatchlist(summaryData.subscriptionWatchlist || []);
      setStatus({
        loading: false,
        error: "",
      });
    } catch {
      setStatus({
        loading: false,
        error: "Member admin data could not be loaded.",
      });
    }
  }

  async function selectMember(userId) {
    setMemberStatus({ loading: true, error: "", success: "" });

    try {
      const data = await getAdminUser(userId);
      setSelectedMember(data);
      setMemberEdit({
        name: data.user.name || "",
        email: data.user.email || "",
        role: data.user.role || "member",
      });
      setMemberStatus({ loading: false, error: "", success: "" });
    } catch (error) {
      setMemberStatus({ loading: false, error: error.message || "Could not load member details.", success: "" });
    }
  }

  async function handleMemberChange(event) {
    const { name, value } = event.target;
    setMemberEdit((current) => ({ ...current, [name]: value }));
  }

  function handleScoreFormChange(event) {
    const { name, value } = event.target;
    setScoreForm((current) => ({ ...current, [name]: value }));
  }

  function startScoreEdit(score) {
    setEditingScoreId(score.id);
    setScoreForm({
      courseName: score.courseName || "",
      grossScore: String(score.grossScore || ""),
      playedAt: score.playedAt || "",
    });
    setScoreStatus({ loading: false, error: "", success: "" });
  }

  function cancelScoreEdit() {
    setEditingScoreId("");
    setScoreForm({ courseName: "", grossScore: "", playedAt: "" });
    setScoreStatus({ loading: false, error: "", success: "" });
  }

  async function saveScoreUpdates(event) {
    event.preventDefault();
    if (!selectedMember || !editingScoreId) {
      return;
    }

    setScoreStatus({ loading: true, error: "", success: "" });

    try {
      await updateScore(editingScoreId, scoreForm);
      await selectMember(selectedMember.user.id);
      setScoreStatus({ loading: false, error: "", success: "Score updated successfully." });
      cancelScoreEdit();
    } catch (error) {
      setScoreStatus({ loading: false, error: error.message || "Unable to update score.", success: "" });
    }
  }

  async function saveMemberUpdates(event) {
    event.preventDefault();
    if (!selectedMember) {
      return;
    }

    setMemberStatus({ loading: true, error: "", success: "" });

    try {
      const response = await updateAdminUser(selectedMember.user.id, memberEdit);
      setSelectedMember((current) => ({
        ...current,
        user: response.user,
      }));
      setMemberRows((rows) =>
        rows.map((row) => (row.id === selectedMember.user.id ? { ...row, name: response.user.name, email: response.user.email, role: response.user.role } : row))
      );
      setMemberStatus({ loading: false, error: "", success: "Member updated successfully." });
    } catch (error) {
      setMemberStatus({ loading: false, error: error.message || "Unable to save member updates.", success: "" });
    }
  }

  return (
    <div className="stack-page">
      <section className="dashboard-hero admin-hero">
        <SectionHeading
          eyebrow="Admin members"
          title="Members and subscription health"
          description="This page is for people, not draw logic. Use it to understand who is on the platform, what they are subscribed to, and where support is needed."
        />
        <motion.div className="dashboard-highlight" {...reveal}>
          <span className="pill pill-soft">Member operations</span>
          <h3>{metrics ? `${metrics.totalSubscribers} subscriber accounts` : "Loading member totals"}</h3>
          <p>Review account details, charity choices, score activity, membership state, and payout visibility without extra clutter.</p>
        </motion.div>
      </section>

      {metrics ? (
        <div className="stats-grid">
          <motion.article className="stat-card stat-card-dark" {...reveal}>
            <span>Total users</span>
            <strong>{metrics.totalUsers}</strong>
            <p>All accounts available to the platform.</p>
          </motion.article>
          <motion.article className="stat-card" {...reveal}>
            <span>Subscribers</span>
            <strong>{metrics.totalSubscribers}</strong>
            <p>Member accounts participating in the subscription flow.</p>
          </motion.article>
          <motion.article className="stat-card" {...reveal}>
            <span>Active subscriptions</span>
            <strong>{metrics.activeSubscriptions}</strong>
            <p>Members currently eligible for score entry and draw participation.</p>
          </motion.article>
          <motion.article className="stat-card" {...reveal}>
            <span>Admins</span>
            <strong>{metrics.totalAdmins}</strong>
            <p>Protected control accounts with admin access.</p>
          </motion.article>
        </div>
      ) : null}

      <motion.article className="content-card settings-card" {...reveal}>
        <div className="table-toolbar">
          <div>
            <p className="eyebrow">Member records</p>
            <h3>Account activity and profile signals</h3>
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
                <th>Actions</th>
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
                    <td>
                      <button className="button button-secondary button-small" type="button" onClick={() => selectMember(member.id)}>
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="table-empty">No member records yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.article>

      {selectedMember ? (
        <motion.article className="content-card content-card-accent" {...reveal}>
          <div className="table-toolbar">
            <div>
              <p className="eyebrow">Member details</p>
              <h3>Edit and review {selectedMember.user.name}</h3>
            </div>
          </div>

          <form className="auth-form" onSubmit={saveMemberUpdates}>
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                name="name"
                value={memberEdit.name}
                onChange={handleMemberChange}
                required
              />
            </label>

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={memberEdit.email}
                onChange={handleMemberChange}
                required
              />
            </label>

            <label className="field">
              <span>Role</span>
              <select name="role" value={memberEdit.role} onChange={handleMemberChange}>
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
            </label>

            <button className="button button-primary" type="submit" disabled={memberStatus.loading}>
              {memberStatus.loading ? "Saving member..." : "Save member"}
            </button>

            {memberStatus.success ? <p className="status-text status-text-success">{memberStatus.success}</p> : null}
            {memberStatus.error ? <p className="status-text status-text-error">{memberStatus.error}</p> : null}
          </form>

          <div className="content-card">
            <p className="eyebrow">Scores history</p>
            <ul className="list-plain">
              {selectedMember.scores.length ? (
                selectedMember.scores.map((score) => (
                  <li key={score.id}>
                    <div className="list-item-row">
                      <span>
                        <strong>{score.courseName}</strong> — {score.grossScore} strokes on {formatDate(score.playedAt?.slice?.(0, 10) || score.playedAt)}
                      </span>
                      <button className="button button-secondary button-small" type="button" onClick={() => startScoreEdit(score)}>
                        Edit
                      </button>
                    </div>
                  </li>
                ))
              ) : (
                <li>No scores recorded yet.</li>
              )}
            </ul>
          </div>

          {editingScoreId ? (
            <div className="content-card">
              <p className="eyebrow">Edit score</p>
              <form className="auth-form" onSubmit={saveScoreUpdates}>
                <label className="field">
                  <span>Course name</span>
                  <input
                    type="text"
                    name="courseName"
                    value={scoreForm.courseName}
                    onChange={handleScoreFormChange}
                    required
                  />
                </label>

                <label className="field">
                  <span>Gross score</span>
                  <input
                    type="number"
                    name="grossScore"
                    value={scoreForm.grossScore}
                    onChange={handleScoreFormChange}
                    min="1"
                    max="45"
                    required
                  />
                </label>

                <label className="field">
                  <span>Date played</span>
                  <input
                    type="date"
                    name="playedAt"
                    value={scoreForm.playedAt}
                    onChange={handleScoreFormChange}
                    required
                  />
                </label>

                <div className="button-row">
                  <button className="button button-primary" type="submit" disabled={scoreStatus.loading}>
                    {scoreStatus.loading ? "Saving..." : "Save score"}
                  </button>
                  <button className="button button-secondary" type="button" onClick={cancelScoreEdit}>
                    Cancel
                  </button>
                </div>

                {scoreStatus.success ? <p className="status-text status-text-success">{scoreStatus.success}</p> : null}
                {scoreStatus.error ? <p className="status-text status-text-error">{scoreStatus.error}</p> : null}
              </form>
            </div>
          ) : null}
        </motion.article>
      ) : null}

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

      {status.loading ? <p className="status-text">Loading member operations...</p> : null}
      {status.error ? <p className="status-text status-text-error">{status.error}</p> : null}
    </div>
  );
}
