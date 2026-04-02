import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import SectionHeading from "../components/SectionHeading";
import { useAuth } from "../context/AuthContext";
import {
  createScore,
  getDashboardSummary,
  getScores,
  getWinningsSummary,
  submitWinningsProof,
  updateDashboardCharitySelection,
  updateScore,
} from "../lib/api";

const emptyScoreForm = {
  courseName: "",
  grossScore: "",
  playedAt: "",
};

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.readAsDataURL(file);
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [summary, setSummary] = useState(null);
  const [charities, setCharities] = useState([]);
  const [selectedCharity, setSelectedCharity] = useState("");
  const [scores, setScores] = useState([]);
  const [rollingAverage, setRollingAverage] = useState(null);
  const [contributionPercentage, setContributionPercentage] = useState("10");
  const [extraDonationAmount, setExtraDonationAmount] = useState("0");
  const [scoreForm, setScoreForm] = useState(emptyScoreForm);
  const [editingScoreId, setEditingScoreId] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [latestProof, setLatestProof] = useState(null);
  const [status, setStatus] = useState({
    loading: true,
    error: "",
    saving: false,
    success: "",
    scoreError: "",
    scoreSuccess: "",
    proofError: "",
    proofSuccess: "",
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [dashboardData, winningsData] = await Promise.all([
        getDashboardSummary(),
        getWinningsSummary(),
      ]);

      setModules(dashboardData.modules);
      setSummary(dashboardData.summary);
      setContributionPercentage(String(dashboardData.summary?.charity?.contributionPercentage || 10));
      setExtraDonationAmount(String(dashboardData.summary?.charity?.extraDonationAmount || 0));
      setCharities(dashboardData.charities || []);
      setSelectedCharity(dashboardData.summary?.charity?.charityId || "");
      setLatestProof(winningsData.latestProof);

      if (dashboardData.summary?.subscription?.status === "active") {
        const scoreData = await getScores();
        setScores(scoreData.scores || []);
        setRollingAverage(scoreData.rollingAverage);
      } else {
        setScores([]);
        setRollingAverage(null);
      }

      setStatus((current) => ({
        ...current,
        loading: false,
        error: "",
      }));
    } catch {
      setStatus((current) => ({
        ...current,
        loading: false,
        error: "Dashboard summary depends on the backend service.",
      }));
    }
  }

  async function handleCharitySave(event) {
    event.preventDefault();
    setStatus((current) => ({
      ...current,
      saving: true,
      error: "",
      success: "",
    }));

    try {
      const response = await updateDashboardCharitySelection(
        selectedCharity,
        Number(extraDonationAmount || 0),
        Number(contributionPercentage || 0)
      );
      setSummary((current) => ({
        ...current,
        charity: response.selection,
      }));
      setExtraDonationAmount(String(response.selection.extraDonationAmount || 0));
      setStatus((current) => ({
        ...current,
        saving: false,
        success: "Charity preference updated.",
      }));
    } catch (error) {
      setStatus((current) => ({
        ...current,
        saving: false,
        error: error.message || "Unable to update charity selection.",
      }));
    }
  }

  async function handleScoreSubmit(event) {
    event.preventDefault();
    setStatus((current) => ({
      ...current,
      saving: true,
      scoreError: "",
      scoreSuccess: "",
    }));

    try {
      if (editingScoreId) {
        await updateScore(editingScoreId, scoreForm);
      } else {
        await createScore(scoreForm);
      }

      const scoreData = await getScores();
      setScores(scoreData.scores || []);
      setRollingAverage(scoreData.rollingAverage);
      setScoreForm(emptyScoreForm);
      setEditingScoreId("");
      setStatus((current) => ({
        ...current,
        saving: false,
        scoreSuccess: editingScoreId ? "Score updated." : "Score added.",
      }));
    } catch (error) {
      setStatus((current) => ({
        ...current,
        saving: false,
        scoreError: error.message || "Unable to save score.",
      }));
    }
  }

  async function handleProofSubmit(event) {
    event.preventDefault();

    if (!proofFile) {
      setStatus((current) => ({
        ...current,
        proofError: "Choose a proof file first.",
        proofSuccess: "",
      }));
      return;
    }

    setStatus((current) => ({
      ...current,
      saving: true,
      proofError: "",
      proofSuccess: "",
    }));

    try {
      const base64Data = await toBase64(proofFile);
      const response = await submitWinningsProof({
        fileName: proofFile.name,
        base64Data,
      });

      setLatestProof(response.proof);
      setProofFile(null);
      await loadDashboard();
      setStatus((current) => ({
        ...current,
        saving: false,
        proofSuccess: "Proof submitted for admin review.",
      }));
    } catch (error) {
      setStatus((current) => ({
        ...current,
        saving: false,
        proofError: error.message || "Unable to submit proof.",
      }));
    }
  }

  function handleScoreFieldChange(event) {
    setScoreForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function startEditing(score) {
    setEditingScoreId(score.id);
    setScoreForm({
      courseName: score.courseName,
      grossScore: String(score.grossScore),
      playedAt: score.playedAt,
    });
    setStatus((current) => ({
      ...current,
      scoreError: "",
      scoreSuccess: "",
    }));
  }

  function resetScoreForm() {
    setEditingScoreId("");
    setScoreForm(emptyScoreForm);
  }

  const isActiveSubscriber = summary?.subscription?.status === "active";
  const hasPendingWinnings =
    (summary?.winnings?.totalWon || 0) > 0 && summary?.winnings?.paymentStatus !== "Paid";
  const memberPriorities = [
    isActiveSubscriber
      ? {
          title: "Log your next round",
          body: "Keep the rolling five-score window fresh so the dashboard reflects your latest form.",
        }
      : {
          title: "Activate membership",
          body: "A live membership unlocks score entry, draw access, and the rest of the member flow.",
        },
    {
      title: "Review charity choice",
      body: `Your contribution is currently pointed at ${summary?.charity?.charityName || "your selected charity"}.`,
    },
    hasPendingWinnings
      ? {
          title: "Finish winner verification",
          body: "A payout is waiting on proof review, so your next best action is to upload evidence.",
        }
      : {
          title: "Stay draw-ready",
          body: "The dashboard keeps your next draw opportunity, scores, and membership state in one place.",
        },
  ];

  const summaryCards = summary
    ? [
        {
          title: "Subscription",
          value: `${summary.subscription.status} · ${summary.subscription.planLabel}`,
          detail: summary.subscription.renewalDate
            ? `Renews on ${summary.subscription.renewalDate}`
            : "No renewal date yet",
        },
        {
          title: "Charity",
          value: summary.charity.charityName,
          detail: `${summary.charity.contributionPercentage}% allocation`,
        },
        {
          title: "Draws",
          value: `${summary.participation.drawsEntered} entered`,
          detail: `${summary.participation.upcomingDraws} upcoming`,
        },
        {
          title: "Rolling average",
          value: rollingAverage !== null ? String(rollingAverage) : "No scores yet",
          detail: "Calculated from the last five scores",
        },
      ]
    : [];

  return (
    <div className="stack-page">
      <section className="dashboard-hero">
        <SectionHeading
          eyebrow="Subscriber dashboard"
          title={`Welcome back${user?.name ? `, ${user.name}` : ""}`}
          description="This is the member cockpit: subscription clarity, charity choice, score momentum, and winnings visibility in one place."
        />
        {summary ? (
          <motion.div className="dashboard-highlight" {...reveal}>
            <span className="pill pill-soft">Current pulse</span>
            <h3>{summary.subscription.planLabel}</h3>
            <p>
              {summary.subscription.status} membership with {summary.participation.upcomingDraws} upcoming
              draw window and {summary.winnings.paymentStatus.toLowerCase()} winnings status.
            </p>
          </motion.div>
        ) : null}
      </section>

      <motion.section className="member-rhythm-strip" {...reveal}>
        <div className="member-rhythm-copy">
          <p className="eyebrow">Member rhythm</p>
          <h3>Keep one eye on progress and the other on possibility.</h3>
          <p>
            This dashboard is built to make the next action obvious, whether that is updating your
            charity, entering a round, or checking your winnings status.
          </p>
        </div>
        <div className="member-rhythm-pills">
          <span className="pill">Live membership state</span>
          <span className="pill">Rolling score flow</span>
          <span className="pill">Draw visibility</span>
          <span className="pill">Proof tracking</span>
        </div>
      </motion.section>

      <motion.section className="action-card-grid" {...reveal}>
        {memberPriorities.map((item) => (
          <article key={item.title} className="action-card">
            <p className="eyebrow">What to do next</p>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </motion.section>

      <div className="stats-grid">
        {summaryCards.map((card) => (
          <motion.article key={card.title} className="stat-card" {...reveal}>
            <span>{card.title}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </motion.article>
        ))}
      </div>

      <div className="panel-grid">
        <motion.form className="content-card content-card-accent settings-card" onSubmit={handleCharitySave} {...reveal}>
          <div>
            <p className="eyebrow">Charity preference</p>
            <h3>Choose where your contribution lands</h3>
            <p>Subscribers can keep this aligned with the mission that matters most to them.</p>
          </div>

          <label className="field">
            <span>Preferred charity</span>
            <select value={selectedCharity} onChange={(event) => setSelectedCharity(event.target.value)}>
              {charities.map((charity) => (
                <option key={charity.id} value={charity.id}>
                  {charity.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Contribution percentage (10–100%)</span>
            <input
              type="number"
              min="10"
              max="100"
              step="1"
              value={contributionPercentage}
              onChange={(event) => setContributionPercentage(event.target.value)}
            />
            <small>Set your charity contribution rate; must be at least 10% of your subscription value.</small>
          </label>

          <label className="field">
            <span>Optional extra donation</span>
            <input
              type="number"
              min="0"
              step="1"
              value={extraDonationAmount}
              onChange={(event) => setExtraDonationAmount(event.target.value)}
            />
            <small>Set an extra donation amount for your current charity selection.</small>
          </label>

          <button className="button button-primary" type="submit" disabled={status.saving || !selectedCharity}>
            {status.saving ? "Saving..." : "Save charity choice"}
          </button>

          {status.success ? <p className="status-text status-text-success">{status.success}</p> : null}
        </motion.form>

        <motion.article className="content-card settings-card" {...reveal}>
          <div>
            <p className="eyebrow">Winnings overview</p>
            <h3>${summary?.winnings?.totalWon || 0}</h3>
            <p>Payment status: {summary?.winnings?.paymentStatus || "No winnings yet"}</p>
            {latestProof ? <p>Latest proof status: {latestProof.status}</p> : null}
          </div>
          <div className="bullet-list">
            <span>Visible payout state</span>
            <span>Proof review tracking</span>
            <span>Stored against your account</span>
          </div>
        </motion.article>
      </div>

      {hasPendingWinnings ? (
        <motion.form className="content-card content-card-glow settings-card" onSubmit={handleProofSubmit} {...reveal}>
          <div>
            <p className="eyebrow">Winner proof upload</p>
            <h3>Submit score evidence for review</h3>
            <p>
              Total won: ${summary?.winnings?.totalWon} · Payment status: {summary?.winnings?.paymentStatus}
            </p>
          </div>

          <label className="field">
            <span>Proof screenshot</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setProofFile(event.target.files?.[0] || null)}
            />
          </label>

          <button className="button button-primary" type="submit" disabled={status.saving}>
            {status.saving ? "Uploading..." : "Submit proof"}
          </button>

          {status.proofSuccess ? <p className="status-text status-text-success">{status.proofSuccess}</p> : null}
          {status.proofError ? <p className="status-text status-text-error">{status.proofError}</p> : null}
        </motion.form>
      ) : null}

      {isActiveSubscriber ? (
        <div className="panel-grid">
          <motion.form className="content-card settings-card" onSubmit={handleScoreSubmit} {...reveal}>
            <div>
              <p className="eyebrow">Score entry</p>
              <h3>{editingScoreId ? "Refine a saved round" : "Add a new round"}</h3>
              <p>The five-score rolling logic updates automatically after every save.</p>
            </div>

            <label className="field">
              <span>Course name</span>
              <input
                type="text"
                name="courseName"
                value={scoreForm.courseName}
                onChange={handleScoreFieldChange}
                placeholder="Royal County Club"
                required
              />
            </label>

            <label className="field">
              <span>Stableford score</span>
              <input
                type="number"
                name="grossScore"
                min="1"
                max="45"
                value={scoreForm.grossScore}
                onChange={handleScoreFieldChange}
                placeholder="32"
                required
              />
            </label>

            <label className="field">
              <span>Date played</span>
              <input
                type="date"
                name="playedAt"
                value={scoreForm.playedAt}
                onChange={handleScoreFieldChange}
                required
              />
            </label>

            <div className="hero-actions">
              <button className="button button-primary" type="submit" disabled={status.saving}>
                {status.saving ? "Saving..." : editingScoreId ? "Update score" : "Add score"}
              </button>
              {editingScoreId ? (
                <button className="button button-secondary" type="button" onClick={resetScoreForm}>
                  Cancel edit
                </button>
              ) : null}
            </div>

            {status.scoreSuccess ? <p className="status-text status-text-success">{status.scoreSuccess}</p> : null}
            {status.scoreError ? <p className="status-text status-text-error">{status.scoreError}</p> : null}
          </motion.form>

          <motion.article className="content-card settings-card" {...reveal}>
            <div>
              <p className="eyebrow">Recent scores</p>
              <h3>Rolling window at a glance</h3>
              <p>The latest five rounds shape your live average and participation feel.</p>
            </div>

            <div className="score-list">
              {scores.length ? (
                scores.map((score) => (
                  <div key={score.id} className="score-row">
                    <div>
                      <strong>{score.courseName}</strong>
                      <p>
                        Score {score.grossScore} on {score.playedAt}
                      </p>
                    </div>
                    <button className="button button-secondary button-inline" type="button" onClick={() => startEditing(score)}>
                      Edit
                    </button>
                  </div>
                ))
              ) : (
                <p className="status-text">No scores entered yet.</p>
              )}
            </div>
          </motion.article>
        </div>
      ) : (
        <motion.article className="cta-panel" {...reveal}>
          <div>
            <p className="eyebrow">Score access locked</p>
            <h3>Activate a subscription to unlock score entry and draw participation.</h3>
            <p>The PRD requires restricted feature access for non-subscribers, and that rule is active here.</p>
          </div>
          <Link to="/subscribe" className="button button-primary">
            Go to subscriptions
          </Link>
        </motion.article>
      )}

      <section>
        <SectionHeading
          eyebrow="What this dashboard covers"
          title="The core member modules are all visible from one workspace"
          description="The product keeps key actions close together so the user always knows what they can do next."
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

      {status.loading ? <p className="status-text">Loading dashboard modules...</p> : null}
      {status.error ? <p className="status-text status-text-error">{status.error}</p> : null}
    </div>
  );
}
