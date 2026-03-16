import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  clearVote,
  getMyFavorites,
  getMyVotes,
  getVoteTotals,
  setVote,
  toggleFavorite,
} from "../lib/social";
import { getThumbnailUrl } from "../lib/thumbnail";

const CATEGORIES = [
  "Articles","Books","Courses","YouTube Videos","GitHub Repos",
  "Cheat Sheets","Templates","Newsletters","Podcasts","APIs",
];

const CATEGORY_ICONS = {
  "Articles": "📄", "Books": "📚", "Courses": "🎓",
  "YouTube Videos": "▶️", "GitHub Repos": "🐙", "Cheat Sheets": "📋",
  "Templates": "🗂️", "Newsletters": "📨", "Podcasts": "🎙️", "APIs": "⚡",
};

export default function Browse() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [favSet, setFavSet] = useState(new Set());
  const [myVotes, setMyVotes] = useState(new Map());
  const [totals, setTotals] = useState(new Map());
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("info");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");

      const { data, error } = await supabase
        .from("resource_cards")
        .select("id,title,short_description,link_url,category,created_at,url_normalized,visibility,thumbnail_source,custom_thumbnail_path")
        .eq("visibility", "public")
        .eq("category", category)
        .order("created_at", { ascending: false })
        .limit(60);

      if (error) { setCards([]); setLoading(false); return; }

      const list = data || [];
      setCards(list);

      const ids = list.map((c) => c.id);
      try {
        const [favs, votes, voteTotals] = await Promise.all([
          getMyFavorites(ids), getMyVotes(ids), getVoteTotals(ids),
        ]);
        setFavSet(favs);
        setMyVotes(votes);
        setTotals(voteTotals);
      } catch (e) { console.error(e); }

      setLoading(false);
    })();
  }, [category, session]);

  const showMsg = (text, type = "info") => { setMsg(text); setMsgType(type); };

  const doToggleFav = async (id) => {
    if (!session) { showMsg("Sign in to save favorites", "warning"); return; }
    try {
      const isFav = favSet.has(id);
      await toggleFavorite(id, !isFav);
      const next = new Set(favSet);
      if (isFav) next.delete(id); else next.add(id);
      setFavSet(next);
    } catch (e) { showMsg(e.message, "danger"); }
  };

  const doVote = async (id, value) => {
    if (!session) { showMsg("Sign in to vote", "warning"); return; }
    try {
      const current = myVotes.get(id);
      if (current === value) {
        await clearVote(id);
        const nv = new Map(myVotes); nv.delete(id); setMyVotes(nv);
        const nt = new Map(totals); nt.set(id, (nt.get(id) || 0) - value); setTotals(nt);
      } else {
        await setVote(id, value);
        const prev = current || 0;
        const nt = new Map(totals); nt.set(id, (nt.get(id) || 0) - prev + value); setTotals(nt);
        const nv = new Map(myVotes); nv.set(id, value); setMyVotes(nv);
      }
    } catch (e) { showMsg(e.message, "danger"); }
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.6rem", marginBottom: "6px" }}>
          {CATEGORY_ICONS[category]} {category}
        </h1>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          Browse public resources curated by the community.
        </p>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <span className="filter-label">Category</span>
        <select
          className="form-control"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ maxWidth: 200 }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
          ))}
        </select>

        {!session && (
          <div style={{ marginLeft: "auto", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            <Link to="/auth">Sign in</Link> to vote &amp; save favorites
          </div>
        )}
      </div>

      {msg && (
        <div className={`tc-alert tc-alert-${msgType}`}>
          {msg}
        </div>
      )}

      {loading ? (
        <div className="tc-loading-page">
          <div className="tc-spinner" />
          <span>Loading {category}…</span>
        </div>
      ) : cards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{CATEGORY_ICONS[category]}</div>
          <div className="empty-state-title">No {category} yet</div>
          <div className="empty-state-desc">Be the first to submit a resource in this category.</div>
        </div>
      ) : (
        <div className="cards-grid">
          {cards.map((c) => {
            const score = totals.get(c.id) || 0;
            const mine = myVotes.get(c.id);
            const isFav = favSet.has(c.id);

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
                    <span className={`vote-score ${score > 0 ? "positive" : score < 0 ? "negative" : ""}`}>
                      {score > 0 ? "▲" : score < 0 ? "▼" : "●"} {Math.abs(score)}
                    </span>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="resource-card-actions">
                    <a href={c.link_url} target="_blank" rel="noreferrer" className="btn-open-link">
                      Open ↗
                    </a>

                    <button
                      className={`btn-tc btn-sm ${mine === 1 ? "btn-success" : "btn-ghost"}`}
                      onClick={() => doVote(c.id, +1)}
                      title="Upvote"
                    >
                      ▲
                    </button>
                    <button
                      className={`btn-tc btn-sm ${mine === -1 ? "btn-danger" : "btn-ghost"}`}
                      onClick={() => doVote(c.id, -1)}
                      title="Downvote"
                    >
                      ▼
                    </button>
                    <button
                      className={`btn-tc btn-sm ${isFav ? "btn-warning" : "btn-ghost"}`}
                      onClick={() => doToggleFav(c.id)}
                      title={isFav ? "Remove from favorites" : "Add to favorites"}
                    >
                      {isFav ? "★" : "☆"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
