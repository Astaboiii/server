import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SectionHeading from "../components/SectionHeading";
import { formatMoney } from "../lib/adminUtils";
import { getAdminDrawSummary, runAdminDraw } from "../lib/api";

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.16 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

export default function AdminDrawsPage() {
  const [latestDraw, setLatestDraw] = useState(null);
  const [draws, setDraws] = useState([]);
  const [mode, setMode] = useState("random");
  const [simulate, setSimulate] = useState(false);
  const [winningNumbersInput, setWinningNumbersInput] = useState("");
  const [periodKey, setPeriodKey] = useState("");
  const [simulationResults, setSimulationResults] = useState(null);
  const [status, setStatus] = useState({
    loading: true,
    saving: false,
    error: "",
    success: "",
  });

  useEffect(() => {
    loadDrawData();
  }, []);

  async function loadDrawData() {
    try {
      const drawData = await getAdminDrawSummary();
      setLatestDraw(drawData.latestDraw || null);
      setDraws(drawData.draws || []);
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
        error: "Draw data could not be loaded.",
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
    setSimulationResults(null);

    let parsedWinningNumbers;

    if (winningNumbersInput.trim()) {
      parsedWinningNumbers = winningNumbersInput
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value));

      if (parsedWinningNumbers.length !== 5 || parsedWinningNumbers.some((value) => value < 0 || value > 9)) {
        setStatus((current) => ({
          ...current,
          saving: false,
          error: "Winning numbers must be five digits between 0 and 9, separated by commas.",
        }));
        return;
      }
    }

    try {
      const response = await runAdminDraw({
        mode,
        simulate,
        winningNumbers: parsedWinningNumbers,
        periodKey: periodKey.trim() || undefined,
      });

      const selectedDraw = response.draw || response;
      setLatestDraw(selectedDraw);
      setSimulationResults(response.simulated ? response.results || [] : null);

      if (!simulate) {
        await loadDrawData();
      }

      setStatus((current) => ({
        ...current,
        saving: false,
        success: simulate
          ? `Simulated draw ${selectedDraw.periodKey} completed.`
          : `Monthly draw ${selectedDraw.periodKey} completed.`,
      }));
    } catch (error) {
      setStatus((current) => ({
        ...current,
        saving: false,
        error: error.message || "Unable to run the monthly draw.",
      }));
    }
  }

  const latestWinners = latestDraw?.results?.filter((entry) => entry.amountWon > 0) || [];

  return (
    <div className="stack-page">
      <section className="dashboard-hero admin-hero">
        <SectionHeading
          eyebrow="Admin draws"
          title="Draw control and winner history"
          description="This area is dedicated to the monthly reward engine, so admins can run draws confidently and review outcomes without unrelated member data getting in the way."
        />
        <motion.div className="dashboard-highlight" {...reveal}>
          <span className="pill pill-soft">Draw engine</span>
          <h3>{latestDraw ? `Latest draw ${latestDraw.periodKey}` : "No draws recorded yet"}</h3>
          <p>Track winning numbers, prize distribution, carryovers, and latest winners in one focused workspace.</p>
        </motion.div>
      </section>

      <motion.article className="content-card content-card-accent settings-card" {...reveal}>
        <div className="table-toolbar">
          <div>
            <p className="eyebrow">Run monthly draw</p>
            <h3>Trigger the next draw from this screen</h3>
            <p>Use this once you are satisfied with the current subscriber pool and any pending operational checks.</p>
          </div>
          <button className="button button-primary" type="button" onClick={handleRunDraw} disabled={status.saving}>
            {status.saving ? "Running draw..." : "Run monthly draw"}
          </button>
        </div>

        <div className="settings-grid">
          <label className="field">
            <span>Draw mode</span>
            <select name="mode" value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="random">Random</option>
              <option value="algorithmic">Algorithmic</option>
            </select>
          </label>

          <label className="field">
            <span>Simulation mode</span>
            <div className="field-inline">
              <input
                id="simulateDraw"
                type="checkbox"
                checked={simulate}
                onChange={(event) => setSimulate(event.target.checked)}
              />
              <label htmlFor="simulateDraw">Simulate draw only</label>
            </div>
          </label>

          <label className="field">
            <span>Winning numbers (optional)</span>
            <input
              type="text"
              value={winningNumbersInput}
              onChange={(event) => setWinningNumbersInput(event.target.value)}
              placeholder="e.g. 3,4,7,2,8"
            />
          </label>

          <label className="field">
            <span>Period key (optional)</span>
            <input
              type="text"
              value={periodKey}
              onChange={(event) => setPeriodKey(event.target.value)}
              placeholder="YYYY-MM or custom key"
            />
          </label>
        </div>

        {latestDraw ? (
          <div className="stats-grid stats-grid-compact">
            <article className="stat-card stat-card-dark">
              <span>Latest draw</span>
              <strong>{latestDraw.periodKey}</strong>
              <p>Winning numbers: {latestDraw.winningNumbers?.join(", ") || "-"}</p>
            </article>
            <article className="stat-card">
              <span>Prize pool</span>
              <strong>{formatMoney(latestDraw.basePrizePool)}</strong>
              <p>Carryover out: {formatMoney(latestDraw.jackpotCarryoverOut || 0)}</p>
            </article>
            <article className="stat-card">
              <span>Winning positions</span>
              <strong>{latestWinners.length}</strong>
              <p>Entries paid on the latest draw.</p>
            </article>
          </div>
        ) : null}
      </motion.article>

      <div className="panel-grid">
        <motion.article className="content-card settings-card" {...reveal}>
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
        </motion.article>

        <motion.article className="content-card settings-card" {...reveal}>
          <div className="table-toolbar">
            <div>
              <p className="eyebrow">Latest winners</p>
              <h3>Most recent winning tickets</h3>
            </div>
            <p className="table-caption">{latestWinners.length} winning positions</p>
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
                {latestWinners.length ? (
                  latestWinners.map((result) => (
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
        </motion.article>
      </div>

      {simulationResults ? (
        <motion.article className="content-card settings-card" {...reveal}>
          <div className="table-toolbar">
            <div>
              <p className="eyebrow">Simulation results</p>
              <h3>Preview draw outcomes without persisting a real run</h3>
            </div>
            <p className="table-caption">{simulationResults.length} simulated entries</p>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Match count</th>
                  <th>Ticket</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {simulationResults.length ? (
                  simulationResults.map((result, index) => (
                    <tr key={`${result.userId}-${index}`}>
                      <td>{result.userId}</td>
                      <td>{result.matchCount}</td>
                      <td>{result.ticketNumbers.join(", ")}</td>
                      <td>{formatMoney(result.amountWon)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="table-empty">No simulated winners produced for this draft draw.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.article>
      ) : null}

      {status.success ? <p className="status-text status-text-success">{status.success}</p> : null}
      {status.loading ? <p className="status-text">Loading draw history...</p> : null}
      {status.error ? <p className="status-text status-text-error">{status.error}</p> : null}
    </div>
  );
}
