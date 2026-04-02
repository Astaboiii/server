import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCharities } from "../lib/api";

const initialState = {
  name: "",
  email: "",
  password: "",
  charityId: "",
  contributionPercentage: "10",
  donationAmount: "0",
};

export default function SignupPage() {
  const [form, setForm] = useState(initialState);
  const [charities, setCharities] = useState([]);
  const [loadingCharities, setLoadingCharities] = useState(true);
  const [charityError, setCharityError] = useState("");
  const [status, setStatus] = useState({
    loading: false,
    error: "",
  });
  const { signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadCharities() {
      setLoadingCharities(true);
      setCharityError("");

      try {
        const data = await getCharities();
        setCharities(data);

        if (data.length) {
          setForm((current) => ({
            ...current,
            charityId: current.charityId || data[0].id,
            contributionPercentage:
              current.contributionPercentage || String(data[0].contributionPercentage),
          }));
        }
      } catch (error) {
        setCharityError("Unable to load charity options.");
      } finally {
        setLoadingCharities(false);
      }
    }

    loadCharities();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: "" });

    try {
      await signup(form);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message || "Signup failed.",
      });
      return;
    }

    setStatus({ loading: false, error: "" });
  }

  function handleChange(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  return (
    <div className="stack-page">
      <section className="auth-shell">
        <article className="auth-panel auth-panel-center">
          <p className="eyebrow">New subscriber</p>
          <h2>Create your account</h2>
          <p className="subheading">
            Join and start tracking scores, subscriptions, charity voting, and draw entries.
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Full name</span>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your name"
                required
              />
            </label>

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Choose a secure password"
                required
              />
            </label>

            <label className="field">
              <span>Charity to support</span>
              <select
                name="charityId"
                value={form.charityId}
                onChange={handleChange}
                required
                disabled={loadingCharities}
              >
                <option value="" disabled>
                  {loadingCharities ? "Loading charities..." : "Select a charity"}
                </option>
                {charities.map((charity) => (
                  <option key={charity.id} value={charity.id}>
                    {charity.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Monthly donation percentage</span>
              <input
                type="number"
                name="contributionPercentage"
                value={form.contributionPercentage}
                onChange={handleChange}
                min="10"
                max="100"
                step="1"
                required
              />
              <small>Minimum 10% of monthly subscription revenue.</small>
            </label>

            <label className="field">
              <span>Optional extra donation</span>
              <input
                type="number"
                name="donationAmount"
                value={form.donationAmount}
                onChange={handleChange}
                min="0"
                step="1"
              />
              <small>Enter an additional one-time donation amount for your first month.</small>
            </label>

            {charityError ? <p className="status-text status-text-error">{charityError}</p> : null}

            <button className="button button-primary" type="submit" disabled={status.loading || loadingCharities}>
              {status.loading ? "Creating account..." : "Create account"}
            </button>

            {status.error ? <p className="status-text status-text-error">{status.error}</p> : null}
          </form>

          <div className="auth-footer">
            <p>Already registered? <Link to="/login">Log in here.</Link></p>
          </div>
        </article>
      </section>
    </div>
  );
}
