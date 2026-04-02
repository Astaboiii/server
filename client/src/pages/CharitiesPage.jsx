import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SectionHeading from "../components/SectionHeading";
import { getCharities } from "../lib/api";

export default function CharitiesPage() {
  const [charities, setCharities] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCharity, setSelectedCharity] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: "" });

  useEffect(() => {
    let isMounted = true;

    getCharities()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setCharities(data);
        setStatus({ loading: false, error: "" });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setStatus({
          loading: false,
          error: "Charities will appear here once the API is available.",
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCharities = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return charities;
    }

    return charities.filter((charity) => {
      return (
        charity.name.toLowerCase().includes(query) ||
        charity.mission.toLowerCase().includes(query)
      );
    });
  }, [charities, search]);

  return (
    <div className="stack-page">
      <section className="page-banner">
        <SectionHeading
          eyebrow="Charity directory"
          title="Subscribers choose where the platform leaves a mark"
          description="Giving is not an afterthought here. Members choose a charity and see their contribution linked to every month they stay in."
        />
      </section>

      <section className="grid-two">
        <article className="content-card content-card-accent">
          <p className="eyebrow">Why it matters</p>
          <h3>Impact should feel concrete, not abstract.</h3>
          <p>
            Each subscription carries a charitable contribution, and the selected
            recipient becomes part of the member identity inside the dashboard.
          </p>
        </article>
        <article className="content-card">
          <p className="eyebrow">Contribution model</p>
          <h3>Choice with visible allocation</h3>
          <p>
            The contribution percentage is stored with the member profile so the admin
            team and subscriber can both understand where value is flowing.
          </p>
        </article>
      </section>

      <section className="content-card">
        <label className="field">
          <span>Search charities</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by charity name or mission"
          />
        </label>
      </section>

      <div className="feature-grid">
        {filteredCharities.map((charity) => (
          <article
            key={charity.id}
            className={`feature-card feature-card-charity ${selectedCharity?.id === charity.id ? "feature-card-active" : ""}`}
          >
            <span className="pill pill-soft">{charity.contributionPercentage}% contribution share</span>
            <h3>{charity.name}</h3>
            <p>{charity.mission}</p>
            <div className="feature-card-footer">
              <button className="button button-secondary button-small" type="button" onClick={() => setSelectedCharity(charity)}>
                {selectedCharity?.id === charity.id ? "Selected" : "Preview"}
              </button>
              <Link className="button button-primary button-small" to={`/charities/${charity.id}`}>
                View profile
              </Link>
            </div>
          </article>
        ))}
      </div>

      {selectedCharity ? (
        <section className="content-card content-card-accent">
          <div className="table-toolbar">
            <div>
              <p className="eyebrow">Charity profile</p>
              <h3>{selectedCharity.name}</h3>
            </div>
            <button className="button button-secondary button-small" type="button" onClick={() => setSelectedCharity(null)}>
              Clear selection
            </button>
          </div>
          <p>{selectedCharity.mission}</p>
          <ul className="list-plain">
            <li><strong>Contribution share:</strong> {selectedCharity.contributionPercentage}%</li>
            <li><strong>Program ID:</strong> {selectedCharity.id}</li>
          </ul>
        </section>
      ) : null}

      {status.loading ? <p className="status-text">Loading charities...</p> : null}
      {status.error ? <p className="status-text status-text-error">{status.error}</p> : null}
    </div>
  );
}
