import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getVoteTotals } from "../lib/social";

export default function Home() {
  const [popular, setPopular] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [scores, setScores] = useState(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Grab a pool of recent public cards
      const { data: cards, error } = await supabase
        .from("resource_cards")
        .select("id,title,short_description,link_url,category,created_at,visibility")
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

      // Compute vote totals (pilot: client-side aggregation)
      const totals = await getVoteTotals(ids);
      setScores(totals);

      // Popular = top 3 by score, tie-breaker newest
      const sortedByScore = [...list].sort((a, b) => {
        const sa = totals.get(a.id) || 0;
        const sb = totals.get(b.id) || 0;
        if (sb !== sa) return sb - sa;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setPopular(sortedByScore.slice(0, 3));

      // Featured = newest 3 (pilot)
      setFeatured(list.slice(0, 3));

      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h2>Home</h2>
      <p>Public resources are visible even when logged out.</p>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <h3>Popular (top voted)</h3>
          <CardRow cards={popular} scores={scores} />

          <h3 style={{ marginTop: 24 }}>Featured (newest)</h3>
          <CardRow cards={featured} scores={scores} />
        </>
      )}
    </div>
  );
}

function CardRow({ cards, scores }) {
  if (!cards.length) return <p>No public cards yet.</p>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
      {cards.map((c) => (
        <div key={c.id} style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>ID: {c.id}</div>
          <div style={{ fontWeight: 700 }}>{c.title}</div>
          <div style={{ fontSize: 14, marginTop: 6 }}>{c.short_description}</div>
          <div style={{ fontSize: 12, marginTop: 8, opacity: 0.8 }}>
            Score: <b>{scores.get(c.id) || 0}</b> • {c.category}
          </div>
          <a href={c.link_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8 }}>
            Open link
          </a>
        </div>
      ))}
    </div>
  );
}