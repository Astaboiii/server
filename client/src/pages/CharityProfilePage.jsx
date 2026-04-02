import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SectionHeading from "../components/SectionHeading";
import { getCharityById } from "../lib/api";

export default function CharityProfilePage() {
  const { charityId } = useParams();
  const [charity, setCharity] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: "" });

  useEffect(() => {
    let isMounted = true;

    async function loadCharity() {
      try {
        const data = await getCharityById(charityId);
        if (!isMounted) {
          return;
        }

        if (!data?.charity) {
          throw new Error("Charity not found.");
        }

        setCharity(data.charity);
        setStatus({ loading: false, error: "" });
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setStatus({ loading: false, error: error.message || "Unable to load charity profile." });
      }
    }

    loadCharity();

    return () => {
      isMounted = false;
    };
  }, [charityId]);

  return (
    <div className="stack-page">
      <section className="page-banner">
        <SectionHeading
          eyebrow="Charity profile"
          title={charity?.name || "Charity details"}
          description="Learn more about the mission, contribution share, and how this partner fits into member giving."
        />
      </section>

      {status.loading ? (
        <p className="status-text">Loading charity profile...</p>
      ) : status.error ? (
        <p className="status-text status-text-error">{status.error}</p>
      ) : (
        <div className="content-card content-card-accent">
          <div className="table-toolbar">
            <div>
              <p className="eyebrow">Mission statement</p>
              <h3>{charity.name}</h3>
            </div>
            <Link className="button button-secondary button-small" to="/charities">
              Back to directory
            </Link>
          </div>
          <p>{charity.mission}</p>
          <div className="feature-grid">
            <article className="feature-card feature-card-charity">
              <span className="pill pill-soft">Contribution share</span>
              <h3>{charity.contributionPercentage}%</h3>
              <p>This is the stored percentage used by the platform when a member selects this charity.</p>
            </article>
            <article className="feature-card feature-card-charity">
              <span className="pill pill-soft">Charity ID</span>
              <h3>{charity.id}</h3>
              <p>This identifier is used for charity selection and reporting across the member experience.</p>
            </article>
          </div>
        </div>
      )}
    </div>
  );
}
