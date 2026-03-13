import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { normalizeUrl } from "../lib/normalizeUrl";
import { getMyFavorites } from "../lib/social";
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [cards, setCards] = useState([]);
  const [favoriteCards, setFavoriteCards] = useState([]);
  const [favLoading, setFavLoading] = useState(false);

  // form state
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  const userId = session?.user?.id;

  const loadMyFavorites = async () => {
  setFavLoading(true);
  try {
    // get all favorites for this user
    const { data: favRows, error: favErr } = await supabase
      .from("favorites")
      .select("resource_id")
      .eq("user_id", userId);

    if (favErr) throw favErr;

    const ids = (favRows || []).map((r) => r.resource_id);
    if (ids.length === 0) {
      setFavoriteCards([]);
      setFavLoading(false);
      return;
    }

    const { data: res, error: resErr } = await supabase
      .from("resource_cards")
      .select("id,title,short_description,link_url,category,visibility,share_status,created_at")
      .in("id", ids)
      .order("created_at", { ascending: false });

    if (resErr) throw resErr;
    setFavoriteCards(res || []);
  } catch (e) {
    console.error(e);
  } finally {
    setFavLoading(false);
  }
};

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setShortDescription("");
    setLinkUrl("");
    setCategory(CATEGORIES[0]);
  };

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [cards]);

  // auth guard
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
      if (!data.session) navigate("/auth");
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) navigate("/auth");
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  // load my cards
  useEffect(() => {
    if (!userId) return;
    fetchMyCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchMyCards = async () => {
    setMessage("");
    const { data, error } = await supabase
      .from("resource_cards")
      .select(
        "id,title,short_description,link_url,url_normalized,category,visibility,share_status,created_at,updated_at,thumbnail_path"
      )
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage("❌ Failed to load your cards: " + error.message);
      return;
    }
    setCards(data || []);
    await loadMyFavorites();
  };

  const startEdit = (card) => {
    setEditingId(card.id);
    setTitle(card.title || "");
    setShortDescription(card.short_description || "");
    setLinkUrl(card.link_url || "");
    setCategory(card.category || CATEGORIES[0]);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeCard = async (cardId) => {
    if (!confirm("Delete this card? This cannot be undone.")) return;
    setMessage("");

    const { error } = await supabase.from("resource_cards").delete().eq("id", cardId);

    if (error) {
      setMessage("❌ Delete failed: " + error.message);
      return;
    }

    setMessage("✅ Deleted");
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  const saveCard = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const urlNorm = normalizeUrl(linkUrl);

    try {
      if (!title.trim()) throw new Error("Title is required");
      if (!linkUrl.trim()) throw new Error("Link URL is required");

      if (editingId) {
        // update
        const { data, error } = await supabase
          .from("resource_cards")
          .update({
            title: title.trim(),
            short_description: shortDescription.trim(),
            link_url: linkUrl.trim(),
            url_normalized: urlNorm,
            category,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId)
          .select()
          .single();

        if (error) throw error;

        setCards((prev) => prev.map((c) => (c.id === editingId ? data : c)));
        setMessage("✅ Updated");
        resetForm();
      } else {
        // insert (private by default)
        const { data, error } = await supabase
          .from("resource_cards")
          .insert({
            owner_id: userId,
            title: title.trim(),
            short_description: shortDescription.trim(),
            link_url: linkUrl.trim(),
            url_normalized: urlNorm,
            category,
            // visibility defaults to private, share_status defaults to none
          })
          .select()
          .single();

        if (error) throw error;

        setCards((prev) => [data, ...prev]);
        setMessage("✅ Created (private)");
        resetForm();
      }
    } catch (err) {
      setMessage("❌ " + (err?.message || "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const requestShare = async (cardId) => {
    setMessage("");
    const { error } = await supabase.rpc("request_share", { p_resource_id: cardId });
    if (error) {
      setMessage("❌ Share request failed: " + error.message);
      return;
    }
    setMessage("✅ Sent for review (pending)");
    await fetchMyCards();
  };

  if (loading) return <p>Loading...</p>;
  if (!session) return null;

  return (
    <div>
      <h2>Dashboard</h2>
      <p>
        Logged in as <b>{session.user.email}</b>
      </p>

      <div style={{ marginTop: 16, border: "1px solid #eee", padding: 12, borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>{editingId ? "Edit resource" : "Create a new resource"}</h3>

        <form onSubmit={saveCard} style={{ display: "grid", gap: 10 }}>
          <label>
            Title *
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
              required
            />
          </label>

          <label>
            Short description
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4, minHeight: 70 }}
            />
          </label>

          <label>
            Link URL *
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
              required
              placeholder="https://example.com"
            />
          </label>

          <label>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <button disabled={saving} type="submit" style={{ padding: 10 }}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Create"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                style={{ padding: 10 }}
                disabled={saving}
              >
                Cancel
              </button>
            )}
          </div>

          {message && (
            <div style={{ padding: 10, background: "#f6f6f6", borderRadius: 8 }}>{message}</div>
          )}
        </form>
      </div>

      <h3 style={{ marginTop: 20 }}>My cards</h3>
      {sortedCards.length === 0 ? (
        <p>You have no cards yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {sortedCards.map((c) => {
            const canRequest =
              c.visibility === "private" && (c.share_status === "none" || c.share_status === "denied" || c.share_status === "duplicate");

            return (
              <div key={c.id} style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}>

                <img
  src={getThumbnailUrl(c)}
  alt={c.title}
  style={{
    width: 180,
    height: 120,
    objectFit: "cover",
    borderRadius: 8,
    marginBottom: 10,
    background: "#f5f5f5",
  }}
/>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Resource ID: {c.id}</div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{c.title}</div>
                    {c.short_description && <div style={{ marginTop: 6 }}>{c.short_description}</div>}

                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
                      {c.category} • {c.visibility.toUpperCase()} • Share status:{" "}
                      <b>{c.share_status}</b>
                    </div>

                    <a href={c.link_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8 }}>
                      Open link
                    </a>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 140 }}>
                    <button onClick={() => startEdit(c)}>Edit</button>
                    <button onClick={() => removeCard(c.id)}>Delete</button>

                    {canRequest ? (
                      <button onClick={() => requestShare(c.id)}>Request to publish</button>
                    ) : c.share_status === "pending" ? (
                      <button disabled>Pending review</button>
                    ) : c.visibility === "public" ? (
                      <button disabled>Public</button>
                    ) : (
                      <button disabled>Not eligible</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <h3 style={{ marginTop: 24 }}>My favorites</h3>
{favLoading ? (
  <p>Loading favorites...</p>
) : favoriteCards.length === 0 ? (
  <p>No favorites yet.</p>
) : (
  <div style={{ display: "grid", gap: 12 }}>
    {favoriteCards.map((c) => (
      <div key={c.id} style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}>
        <img
  src={getThumbnailUrl(c)}
  alt={c.title}
  style={{
    width: 180,
    height: 120,
    objectFit: "cover",
    borderRadius: 8,
    marginBottom: 10,
    background: "#f5f5f5",
  }}
/>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Resource ID: {c.id}</div>
        <div style={{ fontWeight: 700 }}>{c.title}</div>
        {c.short_description && <div style={{ marginTop: 6 }}>{c.short_description}</div>}
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
          {c.category} • {c.visibility.toUpperCase()}
        </div>
        <a href={c.link_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8 }}>
          Open link
        </a>
      </div>
    ))}
  </div>
)}
    </div>
  );
}