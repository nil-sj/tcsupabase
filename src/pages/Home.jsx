import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getVoteTotals } from "../lib/social";
import { getThumbnailUrl } from "../lib/thumbnail";

export default function Home() {
  const [popular, setPopular] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [scores, setScores] = useState(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: cards, error } = await supabase
        .from("resource_cards")
        .select(
          "id,title,short_description,link_url,category,created_at,visibility,thumbnail_source,custom_thumbnail_path"
        )
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(60);

      if (error) {
        console.error(error);
        setPopular([]);
        setFeatured([]);
        setLoading(false);
        return;
      }

      const list = cards || [];
      const ids = list.map((c) => c.id);
      const totals = await getVoteTotals(ids);
      setScores(totals);

      const sortedByScore = [...list].sort((a, b) => {
        const sa = totals.get(a.id) || 0;
        const sb = totals.get(b.id) || 0;
        if (sb !== sa) return sb - sa;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setPopular(sortedByScore.slice(0, 3));
      setFeatured(list.slice(0, 3));
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      {/* Hero */}
      <div className="hero animate-in">
        <div className="hero-title">
          Discover &amp; share<br />
          <span>tech resources</span>
        </div>
        <p className="hero-subtitle">
          A curated library of articles, courses, repos, and tools — saved privately or published for the community.
        </p>
        <div className="hero-actions">
          <Link to="/browse" className="btn-tc btn-primary btn-lg">
            Browse Library
          </Link>
          <Link to="/auth" className="btn-tc btn-ghost btn-lg">
            Get Started
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="tc-loading-page">
          <div className="tc-spinner" />
          <span>Loading resources…</span>
        </div>
      ) : (
        <>
          {/* Popular section */}
          <div className="section-header" style={{ marginTop: 16 }}>
            <h2 className="section-title">🔥 Top Voted</h2>
            <Link to="/browse" className="btn-tc btn-ghost btn-sm">See all →</Link>
          </div>
          <CardRow cards={popular} scores={scores} />

          {/* Featured section */}
          <div className="section-header" style={{ marginTop: 40 }}>
            <h2 className="section-title">✨ Newest Additions</h2>
            <Link to="/browse" className="btn-tc btn-ghost btn-sm">See all →</Link>
          </div>
          <CardRow cards={featured} scores={scores} />
        </>
      )}
    </div>
  );
}

function CardRow({ cards, scores }) {
  if (!cards.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📭</div>
        <div className="empty-state-title">No public cards yet</div>
        <div className="empty-state-desc">Be the first to contribute a resource!</div>
      </div>
    );
  }

  return (
    <div className="cards-grid">
      {cards.map((c) => {
        const score = scores.get(c.id) || 0;
        return (
          <div key={c.id} className="resource-card">
            <img
              src={getThumbnailUrl(c)}
              alt={c.title}
              className="resource-card-img"
            />
            <div className="resource-card-body">
              <div className="resource-card-id">{c.id}</div>
              <div className="resource-card-title">{c.title}</div>
              {c.short_description && (
                <div className="resource-card-desc">{c.short_description}</div>
              )}
              <div className="resource-card-meta">
                <span className="badge-tc badge-category">{c.category}</span>
                <span className={`vote-score ${score > 0 ? "positive" : score < 0 ? "negative" : ""}`}>
                  {score > 0 ? "▲" : score < 0 ? "▼" : "●"} {Math.abs(score)}
                </span>
              </div>
              <div className="resource-card-actions">
                <a
                  href={c.link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-open-link"
                >
                  Open ↗
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
