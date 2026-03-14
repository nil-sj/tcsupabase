import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { normalizeUrl } from "../lib/normalizeUrl";
import { getThumbnailUrl } from "../lib/thumbnail";
import { uploadCustomThumbnail, removeCustomThumbnail } from "../lib/storage";

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
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState("");

  const [cards, setCards] = useState([]);
  const [favoriteCards, setFavoriteCards] = useState([]);
  const [favLoading, setFavLoading] = useState(false);

  const [uploadingForId, setUploadingForId] = useState(null);

  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    username: "",
    role: "user",
    level: 1,
  });

  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  const userId = session?.user?.id;

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

  useEffect(() => {
    if (!userId) return;
    fetchProfile();
    fetchMyCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("first_name,last_name,username,role,level")
      .eq("id", userId)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setProfile({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        username: data.username || "",
        role: data.role || "user",
        level: data.level || 1,
      });
    }
  };

  const loadMyFavorites = async () => {
    setFavLoading(true);
    try {
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
        .select(
          "id,title,short_description,link_url,category,visibility,share_status,created_at,thumbnail_source,custom_thumbnail_path"
        )
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

  const fetchMyCards = async () => {
    setMessage("");
    const { data, error } = await supabase
      .from("resource_cards")
      .select(
        "id,title,short_description,link_url,url_normalized,category,visibility,share_status,created_at,updated_at,thumbnail_path,thumbnail_source,custom_thumbnail_path"
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

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setMessage("");

    const payload = {
      first_name: profile.first_name.trim() || null,
      last_name: profile.last_name.trim() || null,
      username: profile.username.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").update(payload).eq("id", userId);

    if (error) {
      setMessage("❌ Profile update failed: " + error.message);
      setSavingProfile(false);
      return;
    }

    setMessage("✅ Profile updated");
    setSavingProfile(false);
    await fetchProfile();
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
    setFavoriteCards((prev) => prev.filter((c) => c.id !== cardId));
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
        const { data, error } = await supabase
          .from("resource_cards")
          .insert({
            owner_id: userId,
            title: title.trim(),
            short_description: shortDescription.trim(),
            link_url: linkUrl.trim(),
            url_normalized: urlNorm,
            category,
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

  const uploadThumbnailForCard = async (cardId, file) => {
    if (!file) return;
    setMessage("");
    setUploadingForId(cardId);

    try {
      const path = await uploadCustomThumbnail(file, userId);

      const { data: currentCard, error: loadErr } = await supabase
        .from("resource_cards")
        .select("id,custom_thumbnail_path")
        .eq("id", cardId)
        .single();

      if (loadErr) throw loadErr;

      const oldPath = currentCard?.custom_thumbnail_path || null;

      const { error: updateErr } = await supabase
        .from("resource_cards")
        .update({
          custom_thumbnail_path: path,
          thumbnail_source: "custom",
          updated_at: new Date().toISOString(),
        })
        .eq("id", cardId);

      if (updateErr) throw updateErr;

      if (oldPath) {
        try {
          await removeCustomThumbnail(oldPath);
        } catch {
          // ignore cleanup failure
        }
      }

      setMessage("✅ Custom thumbnail uploaded");
      await fetchMyCards();
    } catch (err) {
      setMessage("❌ Upload failed: " + (err?.message || "Unknown error"));
    } finally {
      setUploadingForId(null);
    }
  };

  const removeThumbnailOverride = async (card) => {
    setMessage("");
    try {
      if (card.custom_thumbnail_path) {
        try {
          await removeCustomThumbnail(card.custom_thumbnail_path);
        } catch {
          // ignore storage cleanup failure
        }
      }

      const { error } = await supabase
        .from("resource_cards")
        .update({
          custom_thumbnail_path: null,
          thumbnail_source: "default_category",
          updated_at: new Date().toISOString(),
        })
        .eq("id", card.id);

      if (error) throw error;

      setMessage("✅ Custom thumbnail removed");
      await fetchMyCards();
    } catch (err) {
      setMessage("❌ Could not remove thumbnail: " + (err?.message || "Unknown error"));
    }
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
        <h3 style={{ marginTop: 0 }}>My profile</h3>

        <form onSubmit={saveProfile} style={{ display: "grid", gap: 10 }}>
          <label>
            First name
            <input
              value={profile.first_name}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, first_name: e.target.value }))
              }
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>

          <label>
            Last name
            <input
              value={profile.last_name}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, last_name: e.target.value }))
              }
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>

          <label>
            Username
            <input
              value={profile.username}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, username: e.target.value }))
              }
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>

          <div style={{ fontSize: 14, opacity: 0.85 }}>
            Role: <b>{profile.role}</b> &nbsp; | &nbsp; Level: <b>{profile.level}</b>
          </div>

          <button disabled={savingProfile} type="submit" style={{ padding: 10 }}>
            {savingProfile ? "Saving profile..." : "Save profile"}
          </button>
        </form>
      </div>

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
            <div style={{ padding: 10, background: "#f6f6f6", borderRadius: 8 }}>
              {message}
            </div>
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
              c.visibility === "private" &&
              (c.share_status === "none" ||
                c.share_status === "denied" ||
                c.share_status === "duplicate");

            return (
              <div key={c.id} style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Resource ID: {c.id}</div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1 }}>
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

                    <div style={{ fontWeight: 700 }}>{c.title}</div>
                    {c.short_description && <div style={{ marginTop: 6 }}>{c.short_description}</div>}

                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
                      {c.category} • {c.visibility.toUpperCase()} • Share status:{" "}
                      <b>{c.share_status}</b>
                    </div>

                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                      Thumbnail source: <b>{c.thumbnail_source || "default_category"}</b>
                    </div>

                    <a
                      href={c.link_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "inline-block", marginTop: 8 }}
                    >
                      Open link
                    </a>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 180 }}>
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

                    <label style={{ fontSize: 12 }}>
                      Upload custom image
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadThumbnailForCard(c.id, file);
                          e.target.value = "";
                        }}
                        disabled={uploadingForId === c.id}
                        style={{ display: "block", marginTop: 4 }}
                      />
                    </label>

                    {c.thumbnail_source === "custom" && (
                      <button
                        onClick={() => removeThumbnailOverride(c)}
                        disabled={uploadingForId === c.id}
                      >
                        Remove custom image
                      </button>
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
              <a
                href={c.link_url}
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-block", marginTop: 8 }}
              >
                Open link
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}