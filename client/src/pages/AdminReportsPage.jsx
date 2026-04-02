import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SectionHeading from "../components/SectionHeading";
import { formatMoney } from "../lib/adminUtils";
import { getAdminReports } from "../lib/api";

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.16 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

export default function AdminReportsPage() {
  const [reportData, setReportData] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: "" });

  useEffect(() => {
    async function loadReports() {
      try {
        const data = await getAdminReports();
        setReportData(data);
        setStatus({ loading: false, error: "" });
      } catch (error) {
        setStatus({ loading: false, error: error.message || "Unable to load reports." });
      }
    }

    loadReports();
  }, []);

  return (
    <div className="stack-page">
      <section className="dashboard-hero admin-hero">
        <SectionHeading
          eyebrow="Admin reports"
          title="Charity, subscription, and draw analytics"
          description="See the platform’s business and impact performance in one view, including charity contributions and winning trends."
        />
      </section>

      {status.error ? <p className="status-text status-text-error">{status.error}</p> : null}
      {status.loading ? <p className="status-text">Loading report data...</p> : null}

      {reportData ? (
        <>
          <div className="stats-grid">
            <motion.article className="stat-card stat-card-dark" {...reveal}>
              <span>Total users</span>
              <strong>{reportData.metrics.totalUsers}</strong>
              <p>All accounts in the system.</p>
            </motion.article>
            <motion.article className="stat-card" {...reveal}>
              <span>Active subscribers</span>
              <strong>{reportData.metrics.activeSubscribers}</strong>
              <p>Members currently on an active subscription.</p>
            </motion.article>
            <motion.article className="stat-card" {...reveal}>
              <span>Subscriptions</span>
              <strong>{reportData.metrics.totalSubscriptions}</strong>
              <p>All recorded subscription records.</p>
            </motion.article>
            <motion.article className="stat-card" {...reveal}>
              <span>Charity programs</span>
              <strong>{reportData.metrics.totalCharityPrograms}</strong>
              <p>Distinct charity selections across members.</p>
            </motion.article>
          </div>

          <motion.article className="content-card settings-card" {...reveal}>
            <div className="table-toolbar">
              <div>
                <p className="eyebrow">Charity contributions</p>
                <h3>Donation and impact totals by charity</h3>
              </div>
              <p className="table-caption">{reportData.charityTotals.length} charity programs</p>
            </div>

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Charity ID</th>
                    <th>Members</th>
                    <th>Total contribution %</th>
                    <th>Total extra donations</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.charityTotals.length ? (
                    reportData.charityTotals.map((charity) => (
                      <tr key={charity.charityId}>
                        <td>{charity.charityId}</td>
                        <td>{charity.members}</td>
                        <td>{charity.totalContributionPercentage}%</td>
                        <td>{formatMoney(charity.totalDonationAmount)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="table-empty">No charity contribution data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.article>

          <motion.article className="content-card settings-card" {...reveal}>
            <div className="table-toolbar">
              <div>
                <p className="eyebrow">Draw performance</p>
                <h3>Round outcomes and winning counts</h3>
              </div>
              <p className="table-caption">{reportData.drawStats.length} draw periods</p>
            </div>

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Draw</th>
                    <th>Mode</th>
                    <th>Prize pool</th>
                    <th>Carryover out</th>
                    <th>Winners</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.drawStats.length ? (
                    reportData.drawStats.map((draw) => (
                      <tr key={draw.drawId}>
                        <td>{draw.periodKey}</td>
                        <td>{draw.mode}</td>
                        <td>{formatMoney(draw.basePrizePool)}</td>
                        <td>{formatMoney(draw.carryoverOut)}</td>
                        <td>{draw.totalWinners}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="table-empty">No draw data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.article>
        </>
      ) : null}
    </div>
  );
}
