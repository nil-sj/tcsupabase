import { useEffect, useMemo, useState } from "react";
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
  "Articles",
  "Books",
  "Courses",
  "YouTube Videos",
  "GitHub Repos",
  "Cheat Sheets",
  "Templates",
  "Newsletters",
  "Podcasts",
  "APIs",
];

export default function Browse() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const [session, setSession] = useState(null);
  const [favSet, setFavSet] = useState(new Set());
  const [myVotes, setMyVotes] = useState(new Map());
  const [totals, setTotals] = useState(new Map());
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");

      const { data, error } = await supabase
        .from("resource_cards")
        .select(
          "id,title,short_description,link_url,category,created_at,url_normalized",
        )
        .eq("visibility", "public")
        .eq("category", category)
        .order("created_at", { ascending: false })
        .limit(60);

      if (error) {
        console.error(error);
        setCards([]);
        setLoading(false);
        return;
      }

      const list = data || [];
      setCards(list);

      const ids = list.map((c) => c.id);
      try {
        const [favs, votes, voteTotals] = await Promise.all([
          getMyFavorites(ids),
          getMyVotes(ids),
          getVoteTotals(ids),
        ]);
        setFavSet(favs);
        setMyVotes(votes);
        setTotals(voteTotals);
      } catch (e) {
        // ok if logged out; will just show buttons disabled
      }

      setLoading(false);
    })();
  }, [category, session]);

  const title = useMemo(() => `Browse: ${category}`, [category]);

  const doToggleFav = async (id) => {
    setMsg("");
    try {
      const isFav = favSet.has(id);
      await toggleFavorite(id, !isFav);
      const next = new Set(favSet);
      if (isFav) next.delete(id);
      else next.add(id);
      setFavSet(next);
    } catch (e) {
      setMsg("❌ " + e.message);
    }
  };

  const doVote = async (id, value) => {
    setMsg("");
    try {
      const current = myVotes.get(id); // -1 | +1 | undefined
      if (current === value) {
        await clearVote(id);
        const nextVotes = new Map(myVotes);
        nextVotes.delete(id);
        setMyVotes(nextVotes);

        const nextTotals = new Map(totals);
        nextTotals.set(id, (nextTotals.get(id) || 0) - value);
        setTotals(nextTotals);
      } else {
        // if switching from -1 to +1 or vice versa adjust totals
        await setVote(id, value);

        const nextTotals = new Map(totals);
        const prev = current || 0;
        nextTotals.set(id, (nextTotals.get(id) || 0) - prev + value);
        setTotals(nextTotals);

        const nextVotes = new Map(myVotes);
        nextVotes.set(id, value);
        setMyVotes(nextVotes);
      }
    } catch (e) {
      setMsg("❌ " + e.message);
    }
  };

  return (
    <div>
      <h2>{title}</h2>

      <label style={{ display: "block", marginBottom: 12 }}>
        Category:
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ marginLeft: 8, padding: 6 }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      {msg && (
        <div style={{ padding: 10, background: "#f6f6f6", borderRadius: 8 }}>
          {msg}
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : cards.length === 0 ? (
        <p>No public cards in this category yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          {cards.map((c) => {
            const score = totals.get(c.id) || 0;
            const mine = myVotes.get(c.id); // -1, +1, undefined
            const isFav = favSet.has(c.id);

            return (
              <div
                key={c.id}
                style={{
                  border: "1px solid #eee",
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <img
                  src={getThumbnailUrl(c)}
                  alt={c.title}
                  style={{
                    width: "100%",
                    height: 160,
                    objectFit: "cover",
                    borderRadius: 8,
                    marginBottom: 10,
                    background: "#f5f5f5",
                  }}
                />
                <div style={{ fontSize: 12, opacity: 0.7 }}>ID: {c.id}</div>
                <div style={{ fontWeight: 700 }}>{c.title}</div>
                {c.short_description && (
                  <div style={{ marginTop: 6 }}>{c.short_description}</div>
                )}
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
                  Score: <b>{score}</b> •{" "}
                  {new Date(c.created_at).toLocaleDateString()}
                </div>

                <a
                  href={c.link_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-block", marginTop: 8 }}
                >
                  Open link
                </a>

                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button disabled={!session} onClick={() => doVote(c.id, +1)}>
                    {mine === 1 ? "👍 Upvoted" : "👍 Upvote"}
                  </button>
                  <button disabled={!session} onClick={() => doVote(c.id, -1)}>
                    {mine === -1 ? "👎 Downvoted" : "👎 Downvote"}
                  </button>
                </div>

                <div style={{ marginTop: 8 }}>
                  <button disabled={!session} onClick={() => doToggleFav(c.id)}>
                    {isFav ? "★ Favorited" : "☆ Favorite"}
                  </button>
                  {!session && (
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                      Login to vote or favorite
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
