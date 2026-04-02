import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SectionHeading from "../components/SectionHeading";
import {
  getAdminCharities,
  createAdminCharity,
  updateAdminCharity,
  deleteAdminCharity,
} from "../lib/api";

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.16 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

const initialFormState = {
  id: "",
  name: "",
  mission: "",
  contributionPercentage: "10",
};

export default function AdminCharitiesPage() {
  const [charities, setCharities] = useState([]);
  const [selectedCharity, setSelectedCharity] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [status, setStatus] = useState({
    loading: true,
    saving: false,
    error: "",
    success: "",
  });

  useEffect(() => {
    loadCharities();
  }, []);

  async function loadCharities() {
    setStatus({ loading: true, saving: false, error: "", success: "" });

    try {
      const data = await getAdminCharities();
      setCharities(data.charities || []);
      setStatus({ loading: false, saving: false, error: "", success: "" });
    } catch {
      setStatus({ loading: false, saving: false, error: "Unable to load charities.", success: "" });
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function selectCharity(charity) {
    setSelectedCharity(charity);
    setForm({
      id: charity.id,
      name: charity.name,
      mission: charity.mission,
      contributionPercentage: String(charity.contributionPercentage),
    });
    setStatus({ loading: false, saving: false, error: "", success: "" });
  }

  function resetForm() {
    setSelectedCharity(null);
    setForm(initialFormState);
    setStatus((current) => ({ ...current, saving: false, error: "", success: "" }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus((current) => ({ ...current, saving: true, error: "", success: "" }));

    const payload = {
      id: form.id.trim(),
      name: form.name.trim(),
      mission: form.mission.trim(),
      contributionPercentage: Number(form.contributionPercentage),
    };

    try {
      if (selectedCharity) {
        await updateAdminCharity(selectedCharity.id, payload);
        setStatus((current) => ({ ...current, saving: false, success: "Charity updated successfully." }));
      } else {
        await createAdminCharity(payload);
        setStatus((current) => ({ ...current, saving: false, success: "Charity created successfully." }));
        resetForm();
      }

      await loadCharities();
    } catch (error) {
      setStatus((current) => ({
        ...current,
        saving: false,
        error: error.message || "Unable to save charity.",
      }));
    }
  }

  async function handleDelete(charityId) {
    if (!window.confirm("Delete this charity? This cannot be undone.")) {
      return;
    }

    setStatus((current) => ({ ...current, saving: true, error: "", success: "" }));

    try {
      await deleteAdminCharity(charityId);
      await loadCharities();
      resetForm();
      setStatus((current) => ({ ...current, saving: false, success: "Charity deleted successfully." }));
    } catch (error) {
      setStatus((current) => ({
        ...current,
        saving: false,
        error: error.message || "Unable to delete charity.",
      }));
    }
  }

  return (
    <div className="stack-page">
      <section className="dashboard-hero admin-hero">
        <SectionHeading
          eyebrow="Admin charities"
          title="Charity catalog and contribution settings"
          description="Manage the full list of partner charities, their mission copy, and how much of each subscription goes toward impact."
        />
        <motion.div className="dashboard-highlight" {...reveal}>
          <span className="pill pill-soft">Charity control</span>
          <h3>{charities.length ? `${charities.length} charities available` : "Loading charity catalog"}</h3>
          <p>Update the charity pool, keep mission goals current, and ensure every subscriber has meaningful impact options.</p>
        </motion.div>
      </section>

      <div className="panel-grid">
        <motion.article className="content-card settings-card" {...reveal}>
          <div className="table-toolbar">
            <div>
              <p className="eyebrow">Charity list</p>
              <h3>Current partner charities</h3>
            </div>
            <p className="table-caption">{charities.length} charities configured</p>
          </div>

          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Mission</th>
                  <th>Contribution</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {charities.length ? (
                  charities.map((charity) => (
                    <tr key={charity.id}>
                      <td>{charity.id}</td>
                      <td>{charity.name}</td>
                      <td>{charity.mission}</td>
                      <td>{charity.contributionPercentage}%</td>
                      <td>{charity.updatedAt ? charity.updatedAt.slice(0, 10) : "-"}</td>
                      <td>
                        <button className="button button-secondary button-small" type="button" onClick={() => selectCharity(charity)}>
                          Edit
                        </button>
                        <button
                          className="button button-ghost button-small"
                          type="button"
                          onClick={() => handleDelete(charity.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="table-empty">
                      No charities have been configured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.article>

        <motion.article className="content-card settings-card" {...reveal}>
          <div className="table-toolbar">
            <div>
              <p className="eyebrow">Charity editor</p>
              <h3>{selectedCharity ? "Edit charity details" : "Add a new charity"}</h3>
            </div>
          </div>

          <form className="settings-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Charity ID</span>
              <input
                type="text"
                name="id"
                value={form.id}
                onChange={handleChange}
                placeholder="unique-charity-id"
                required
                disabled={Boolean(selectedCharity)}
              />
            </label>

            <label className="field">
              <span>Name</span>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Charity name"
                required
              />
            </label>

            <label className="field">
              <span>Mission statement</span>
              <textarea
                name="mission"
                value={form.mission}
                onChange={handleChange}
                placeholder="Describe the charity mission"
                rows="4"
                required
              />
            </label>

            <label className="field">
              <span>Contribution percentage</span>
              <input
                type="number"
                name="contributionPercentage"
                value={form.contributionPercentage}
                onChange={handleChange}
                min="1"
                max="100"
                step="1"
                required
              />
              <small>Share of subscription revenue allocated to this charity.</small>
            </label>

            <div className="field field-actions">
              <button className="button button-primary" type="submit" disabled={status.saving}>
                {status.saving ? "Saving…" : selectedCharity ? "Save charity" : "Create charity"}
              </button>
              {selectedCharity ? (
                <button className="button button-ghost" type="button" onClick={resetForm} disabled={status.saving}>
                  Cancel
                </button>
              ) : null}
            </div>

            {status.error ? <p className="status-text status-text-error">{status.error}</p> : null}
            {status.success ? <p className="status-text status-text-success">{status.success}</p> : null}
          </form>
        </motion.article>
      </div>

      {status.loading ? <p className="status-text">Loading admin charities…</p> : null}
    </div>
  );
}
