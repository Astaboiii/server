import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();
  const navItems = !isAuthenticated
    ? [
        { to: "/", label: "Home" },
        { to: "/how-it-works", label: "How It Works" },
        { to: "/charities", label: "Charities" },
        { to: "/subscribe", label: "Subscribe" },
        { to: "/login", label: "Login" },
        { to: "/signup", label: "Signup" },
      ]
    : user?.role === "admin"
      ? [
          { to: "/admin", label: "Control Center" },
          { to: "/admin/members", label: "Members" },
          { to: "/admin/charities", label: "Charities" },
          { to: "/admin/reports", label: "Reports" },
          { to: "/admin/draws", label: "Draws" },
          { to: "/admin/proofs", label: "Proof Review" },
          { to: "/", label: "Public Site" },
        ]
      : [
          { to: "/dashboard", label: "Dashboard" },
          { to: "/charities", label: "Charities" },
          { to: "/subscribe", label: "Subscribe" },
        ];

  const accessLabel = user?.role === "admin"
    ? "Admin workspace"
    : isAuthenticated
      ? "Member dashboard"
      : "Public preview";

  return (
    <>
      <motion.header
        className="site-navbar"
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="navbar-brand">
          <NavLink to="/" className="logo">
            <span className="logo-text">Drive For Good</span>
          </NavLink>
        </div>

        <nav className="site-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar-actions">
          {isAuthenticated ? (
            <button className="button button-ghost button-inline" type="button" onClick={logout}>
              Logout
            </button>
          ) : null}
        </div>
      </motion.header>

      <motion.div
        className="navbar-meta"
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="pill pill-soft">{accessLabel}</span>
        {isAuthenticated ? (
          <span className="user-summary">
            Signed in as <strong>{user?.name || user?.email}</strong>
          </span>
        ) : (
          <span className="user-summary">Explore before you subscribe.</span>
        )}
      </motion.div>
    </>
  );
}
