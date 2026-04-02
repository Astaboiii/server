import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SectionHeading from "../components/SectionHeading";
import { formatDate, formatMoney, getProofUrl } from "../lib/adminUtils";
import { getPendingProofs, reviewPendingProof } from "../lib/api";

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.16 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

export default function AdminProofsPage() {
  const [pendingProofs, setPendingProofs] = useState([]);
  const [status, setStatus] = useState({
    loading: true,
    saving: false,
    error: "",
    success: "",
  });

  useEffect(() => {
    loadProofs();
  }, []);

  async function loadProofs() {
    try {
      const proofData = await getPendingProofs();
      setPendingProofs(proofData.proofs || []);
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
        error: "Pending proof submissions could not be loaded.",
        success: "",
      });
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
      await loadProofs();
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

  return (
    <div className="stack-page">
      <section className="dashboard-hero admin-hero">
        <SectionHeading
          eyebrow="Admin proof review"
          title="Verify winners before payout closes"
          description="This page is dedicated to the verification workflow so admins can review evidence quickly and keep payout states trustworthy."
        />
        <motion.div className="dashboard-highlight" {...reveal}>
          <span className="pill pill-soft">Verification queue</span>
          <h3>{pendingProofs.length} submission{pendingProofs.length === 1 ? "" : "s"} awaiting review</h3>
          <p>Inspect uploaded score proof, approve valid winners, and reject anything that does not meet the verification requirement.</p>
        </motion.div>
      </section>

      <motion.section className="action-card-grid" {...reveal}>
        <article className="action-card action-card-admin">
          <p className="eyebrow">What to do here</p>
          <h3>Review evidence fast</h3>
          <p>Open the uploaded proof, compare it with the recorded member context, and make a confident approval decision.</p>
        </article>
        <article className="action-card action-card-admin">
          <p className="eyebrow">Why it matters</p>
          <h3>Protect payout trust</h3>
          <p>The proof queue is the final quality gate between a winning result and a payout state marked as paid.</p>
        </article>
      </motion.section>

      <motion.article className="content-card settings-card" {...reveal}>
        <div className="table-toolbar">
          <div>
            <p className="eyebrow">Pending queue</p>
            <h3>Uploaded proof submissions</h3>
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

      {status.success ? <p className="status-text status-text-success">{status.success}</p> : null}
      {status.loading ? <p className="status-text">Loading proof review queue...</p> : null}
      {status.error ? <p className="status-text status-text-error">{status.error}</p> : null}
    </div>
  );
}
