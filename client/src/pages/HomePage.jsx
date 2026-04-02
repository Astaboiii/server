import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import SectionHeading from "../components/SectionHeading";
import { getPlatformOverview } from "../lib/api";

const riseIn = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
};

const journey = [
  "Subscribe in minutes",
  "Track your latest rounds",
  "Choose a charity you care about",
  "Enter monthly draws automatically",
];

export default function HomePage() {
  const [overview, setOverview] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: "" });

  useEffect(() => {
    let isMounted = true;

    getPlatformOverview()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setOverview(data);
        setStatus({ loading: false, error: "" });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setStatus({
          loading: false,
          error: "Platform overview is unavailable until the backend is running.",
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const highlights = overview?.highlights || [];
  const prizeRules = overview?.prizeRules || [];

  return (
    <div className="stack-page">
      <section className="home-hero">
        <motion.div className="home-hero-copy" {...riseIn}>
          <span className="eyebrow">Charity first. Draw excitement built in.</span>
          <h2>A golf membership experience that feels generous, modern, and worth returning to.</h2>
          <p>
            Drive For Good turns each round into momentum. Members track scores, join monthly
            draws, and direct part of their subscription toward real charitable impact.
          </p>

          <div className="home-hero-actions">
            <Link to="/subscribe" className="button button-primary">
              Start your membership
            </Link>
            <Link to="/how-it-works" className="button button-ghost">
              See the full journey
            </Link>
          </div>

          <div className="home-journey">
            {journey.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="home-hero-board"
          {...riseIn}
          transition={{ ...riseIn.transition, delay: 0.08 }}
        >
          <article className="home-hero-primary-card">
            <p className="eyebrow">Membership snapshot</p>
            <h3>{overview?.experienceTitle || "Scores + draws + giving"}</h3>
            <p>{overview?.experienceCopy || "Built around outcome, not golf cliches."}</p>

            <div className="home-board-stats">
              <div>
                <strong>{prizeRules[0]?.poolShare || 40}%</strong>
                <span>Jackpot tier</span>
              </div>
              <div>
                <strong>5 scores</strong>
                <span>Rolling window logic</span>
              </div>
              <div>
                <strong>1 choice</strong>
                <span>Preferred charity</span>
              </div>
            </div>
          </article>

          <div className="home-board-secondary">
            <article className="home-mini-card home-mini-card-dark">
              <span>Prize pool split</span>
              <strong>
                {prizeRules.map((rule) => `${rule.poolShare}%`).join(" / ") || "40 / 35 / 25"}
              </strong>
              <p>{overview?.prizeHeadline || "Jackpot rollover for 5-number matches."}</p>
            </article>

            <article className="home-mini-card">
              <span>Emotional lead</span>
              <strong>Impact before imagery</strong>
              <p>The interface is designed to feel like purpose-led membership, not a typical golf site.</p>
            </article>
          </div>
        </motion.div>
      </section>

      <motion.section className="home-values-strip" {...riseIn}>
        <div className="home-values-copy">
          <p className="eyebrow">Why it feels different</p>
          <h3>The product sells a feeling: contribution, anticipation, and belonging.</h3>
          <p>
            Sport is only one layer. The deeper UX hook is that the user can do good,
            keep score, and stay connected to a recurring moment of possibility.
          </p>
        </div>
        <div className="home-values-badges">
          <span className="pill">Visible charity impact</span>
          <span className="pill">Monthly draw anticipation</span>
          <span className="pill">Fast score flow</span>
        </div>
      </motion.section>

      <motion.section className="home-story-grid" {...riseIn}>
        <article className="content-card content-card-dark">
          <p className="eyebrow">The promise</p>
          <h3>Every major feature should feel like it belongs to one elegant loop.</h3>
          <p>
            Subscribe, play, log, give, enter, and win. The homepage should make that loop
            feel instantly understandable and emotionally worth joining.
          </p>
        </article>

        <article className="content-card home-checklist-card">
          <p className="eyebrow">What users should understand immediately</p>
          <div className="home-checklist">
            <span>How membership works</span>
            <span>Why the draw is exciting</span>
            <span>How charities stay central</span>
            <span>Why signing up feels worthwhile today</span>
          </div>
        </article>
      </motion.section>

      <section>
        <SectionHeading
          eyebrow="Core pillars"
          title="The product becomes persuasive when each system turns into a user-facing advantage"
          description="These are the parts that make the platform feel complete instead of stitched together."
        />

        <div className="feature-grid">
          {highlights.map((item, index) => (
            <motion.article
              key={item.title}
              className="feature-card home-feature-card"
              {...riseIn}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <span className="feature-index">{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <motion.section className="home-cta-panel" {...riseIn}>
        <div>
          <p className="eyebrow">Step into the actual product</p>
          <h3>Explore the member path, then activate a working account.</h3>
          <p>
            You can preview the charities, understand the mechanics, and move into the
            live dashboard experience without waiting for production payments.
          </p>
        </div>

        <div className="home-hero-actions">
          <Link to="/charities" className="button button-secondary">
            Explore charities
          </Link>
          <Link to="/signup" className="button button-primary">
            Create account
          </Link>
        </div>
      </motion.section>

      {status.loading ? <p className="status-text">Loading platform overview...</p> : null}
      {status.error ? <p className="status-text status-text-error">{status.error}</p> : null}
    </div>
  );
}
