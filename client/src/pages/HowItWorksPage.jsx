import SectionHeading from "../components/SectionHeading";

const steps = [
  {
    title: "Join the membership",
    body: "Start on a monthly or yearly plan and unlock score entry, draw access, and charity selection.",
  },
  {
    title: "Track your rounds",
    body: "Enter golf scores through a simple five-score flow built for speed and consistency.",
  },
  {
    title: "Choose your charity",
    body: "Point part of your membership toward a cause that feels personal and visible.",
  },
  {
    title: "Enter the monthly draw",
    body: "Active members move into the draw engine automatically through their participation state.",
  },
  {
    title: "Verify and get paid",
    body: "If you win, upload proof, wait for admin review, and track payout status in your dashboard.",
  },
];

const roleCards = [
  {
    title: "Public visitor",
    body: "Learns the concept, explores charities, and understands why this feels different before subscribing.",
  },
  {
    title: "Subscriber",
    body: "Manages membership, scores, charity preference, draw participation, and winnings from one place.",
  },
  {
    title: "Administrator",
    body: "Runs draws, monitors subscriptions, reviews proof, and keeps the platform accountable.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="stack-page">
      <section className="page-banner">
        <SectionHeading
          eyebrow="Product flow"
          title="A simple journey on the surface, with strong platform logic underneath"
          description="The member experience feels calm and quick, while the backend handles subscriptions, score rules, prize calculations, and verification."
        />
      </section>

      <section className="split-section">
        <div className="timeline">
          {steps.map((step, index) => (
            <div key={step.title} className="timeline-item">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <aside className="content-card content-card-accent">
          <p className="eyebrow">System feeling</p>
          <h3>Clear, trusted, and emotionally rewarding.</h3>
          <p>
            The key UX move is to make each step feel obvious while still giving the
            user confidence that money, scores, and winnings are being handled carefully.
          </p>
        </aside>
      </section>

      <section>
        <SectionHeading
          eyebrow="Access layers"
          title="Three audiences, one connected platform"
          description="The public site sells the idea, the member area keeps momentum high, and the admin panel protects data quality."
        />
        <div className="grid-three">
          {roleCards.map((card) => (
            <article key={card.title} className="content-card">
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
