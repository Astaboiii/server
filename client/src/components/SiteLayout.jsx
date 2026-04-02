import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";

export default function SiteLayout() {
  const location = useLocation();

  return (
    <div className="site-frame">
      <div className="site-background" />
      <div className="app-shell">
        <Navbar />

        <main className="page-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <motion.footer
          className="site-footer"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.4 }}
        >
          <p>Subscription-led golf, charity visibility, and modern member experience in one product.</p>
          <div className="footer-pills">
            <span className="pill">Score tracking</span>
            <span className="pill">Monthly draws</span>
            <span className="pill">Charity impact</span>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}
