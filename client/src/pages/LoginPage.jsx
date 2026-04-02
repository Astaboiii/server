import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const initialState = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState({
    loading: false,
    error: "",
  });
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: "" });

    try {
      const response = await login(form);
      const destination =
        location.state?.from?.pathname ||
        (response.user.role === "admin" ? "/admin" : "/dashboard");

      navigate(destination, { replace: true });
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message || "Login failed.",
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
        <article className="auth-panel">
          <p className="eyebrow">Member access</p>
          <h2>Log in to pick up your membership journey.</h2>
          <p>
            Subscribers land in their dashboard. Admins move straight into the control
            workspace with draw and review tools.
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
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
                placeholder="Enter your password"
                required
              />
            </label>

            <button className="button button-primary" type="submit" disabled={status.loading}>
              {status.loading ? "Signing in..." : "Log in"}
            </button>

            {status.error ? <p className="status-text status-text-error">{status.error}</p> : null}
          </form>

          <p className="status-text">
            Need an account? <Link to="/signup">Create one here.</Link>
          </p>
        </article>

        <aside className="auth-aside">
          <div className="content-card content-card-accent">
            <p className="eyebrow">What opens after login</p>
            <h3>Your dashboard becomes the center of gravity.</h3>
            <p>Subscription status, charity choice, scores, winnings, and draw visibility all live there.</p>
          </div>
          <div className="content-card">
            <p className="eyebrow">Admin preview</p>
            <h3>Dev admin credentials</h3>
            <p><strong>admin@driveforgood.local</strong></p>
            <p><strong>Admin123!</strong></p>
          </div>
        </aside>
      </section>
    </div>
  );
}
