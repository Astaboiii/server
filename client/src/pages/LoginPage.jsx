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
        <article className="auth-panel auth-panel-center">
          <p className="eyebrow">Member access</p>
          <h2>Welcome back</h2>
          <p className="subheading">
            Sign in to continue to your membership dashboard and rewards workflow.
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

          <div className="auth-footer">
            <p>Need an account? <Link to="/signup">Create one here.</Link></p>
          </div>
        </article>
      </section>
    </div>
  );
}
