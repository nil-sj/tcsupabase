import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { normalizeUrl } from "../lib/normalizeUrl";
import { getThumbnailUrl } from "../lib/thumbnail";
import { uploadCustomThumbnail, removeCustomThumbnail } from "../lib/storage";

const CATEGORIES = [
  "Articles","Books","Courses","YouTube Videos","GitHub Repos",
  "Cheat Sheets","Templates","Newsletters","Podcasts","APIs",
];

function Alert({ msg }) {
  if (!msg) return null;
  const isSuccess = msg.startsWith("✅");
  const isError = msg.startsWith("❌");
  const type = isSuccess ? "success" : isError ? "danger" : "info";
  return (
    <div className={`tc-alert tc-alert-${type}`}>
      {msg}
    </div>
  );
}

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

  const [profile, setProfile] = useState({ first_name: "", last_name: "", username: "", role: "user", level: 1 });
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  const userId = session?.user?.id;

  const resetForm = () => {
    setEditingId(null); setTitle(""); setShortDescription(""); setLinkUrl(""); setCategory(CATEGORIES[0]);
  };

  const sortedCards = useMemo(() => [...cards].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), [cards]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
      if (!data.session) navigate("/auth");
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, newSession) => {
      setSession(newSession);
      if (!newSession) navigate("/auth");
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;
    fetchProfile();
    fetchMyCards();
  }, [userId]);

  const fetchProfile = async () => {
    const { data } = await supabase.from("profiles").select("first_name,last_name,username,role,level").eq("id", userId).single();
    if (data) setProfile({ first_name: data.first_name || "", last_name: data.last_name || "", username: data.username || "", role: data.role || "user", level: data.level || 1 });
  };

  const loadMyFavorites = async () => {
    setFavLoading(true);
    try {
      const { data: favRows, error: favErr } = await supabase.from("favorites").select("resource_id").eq("user_id", userId);
      if (favErr) throw favErr;
      const ids = (favRows || []).map((r) => r.resource_id);
      if (!ids.length) { setFavoriteCards([]); return; }
      const { data: res, error: resErr } = await supabase.from("resource_cards")
        .select("id,title,short_description,link_url,category,visibility,share_status,created_at,thumbnail_source,custom_thumbnail_path")
        .in("id", ids).order("created_at", { ascending: false });
      if (resErr) throw resErr;
      setFavoriteCards(res || []);
    } catch (e) { console.error(e); } finally { setFavLoading(false); }
  };

  const fetchMyCards = async () => {
    setMessage("");
    const { data, error } = await supabase.from("resource_cards")
      .select("id,title,short_description,link_url,url_normalized,category,visibility,share_status,created_at,updated_at,thumbnail_path,thumbnail_source,custom_thumbnail_path")
      .eq("owner_id", userId).order("created_at", { ascending: false });
    if (error) { setMessage("❌ Failed to load your cards: " + error.message); return; }
    setCards(data || []);
    await loadMyFavorites();
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setMessage("");
    const { error } = await supabase.from("profiles").update({
      first_name: profile.first_name.trim() || null,
      last_name: profile.last_name.trim() || null,
      username: profile.username.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", userId);
    if (error) { setMessage("❌ Profile update failed: " + error.message); setSavingProfile(false); return; }
    setMessage("✅ Profile updated");
    setSavingProfile(false);
    await fetchProfile();
  };

  const startEdit = (card) => {
    setEditingId(card.id); setTitle(card.title || ""); setShortDescription(card.short_description || "");
    setLinkUrl(card.link_url || ""); setCategory(card.category || CATEGORIES[0]);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeCard = async (cardId) => {
    if (!confirm("Delete this card? This cannot be undone.")) return;
    const { error } = await supabase.from("resource_cards").delete().eq("id", cardId);
    if (error) { setMessage("❌ Delete failed: " + error.message); return; }
    setMessage("✅ Card deleted");
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
        const { data, error } = await supabase.from("resource_cards").update({
          title: title.trim(), short_description: shortDescription.trim(),
          link_url: linkUrl.trim(), url_normalized: urlNorm, category, updated_at: new Date().toISOString(),
        }).eq("id", editingId).select().single();
        if (error) throw error;
        setCards((prev) => prev.map((c) => (c.id === editingId ? data : c)));
        setMessage("✅ Card updated"); resetForm();
      } else {
        const { data, error } = await supabase.from("resource_cards").insert({
          owner_id: userId, title: title.trim(), short_description: shortDescription.trim(),
          link_url: linkUrl.trim(), url_normalized: urlNorm, category,
        }).select().single();
        if (error) throw error;
        setCards((prev) => [data, ...prev]);
        setMessage("✅ Card created (private)"); resetForm();
      }
    } catch (err) {
      setMessage("❌ " + (err?.message || "Save failed"));
    } finally { setSaving(false); }
  };

  const requestShare = async (cardId) => {
    setMessage("");
    const { error } = await supabase.rpc("request_share", { p_resource_id: cardId });
    if (error) { setMessage("❌ Share request failed: " + error.message); return; }
    setMessage("✅ Submitted for review");
    await fetchMyCards();
  };

  const uploadThumbnailForCard = async (cardId, file) => {
    if (!file) return;
    setMessage("");
    setUploadingForId(cardId);
    try {
      const path = await uploadCustomThumbnail(file, userId);
      const { data: currentCard } = await supabase.from("resource_cards").select("id,custom_thumbnail_path").eq("id", cardId).single();
      const oldPath = currentCard?.custom_thumbnail_path || null;
      await supabase.from("resource_cards").update({ custom_thumbnail_path: path, thumbnail_source: "custom", updated_at: new Date().toISOString() }).eq("id", cardId);
      if (oldPath) { try { await removeCustomThumbnail(oldPath); } catch {} }
      setMessage("✅ Thumbnail uploaded");
      await fetchMyCards();
    } catch (err) {
      setMessage("❌ Upload failed: " + (err?.message || "Unknown error"));
    } finally { setUploadingForId(null); }
  };

  const removeThumbnailOverride = async (card) => {
    setMessage("");
    try {
      if (card.custom_thumbnail_path) { try { await removeCustomThumbnail(card.custom_thumbnail_path); } catch {} }
      await supabase.from("resource_cards").update({ custom_thumbnail_path: null, thumbnail_source: "default_category", updated_at: new Date().toISOString() }).eq("id", card.id);
      setMessage("✅ Custom thumbnail removed");
      await fetchMyCards();
    } catch (err) { setMessage("❌ " + (err?.message || "Unknown error")); }
  };

  if (loading) return <div className="tc-loading-page"><div className="tc-spinner" /><span>Loading dashboard…</span></div>;
  if (!session) return null;

  const shareStatusBadge = (c) => {
    const map = { none: "badge-private", pending: "badge-pending", denied: "badge-denied", duplicate: "badge-denied", accepted: "badge-public" };
    return <span className={`badge-tc ${map[c.share_status] || "badge-private"}`}>{c.share_status}</span>;
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.6rem", marginBottom: "4px" }}>Dashboard</h1>
        <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>
          Logged in as <strong style={{ color: "var(--text-primary)" }}>{session.user.email}</strong>
        </p>
      </div>

      <Alert msg={message} />

      {/* Stats strip */}
      <div className="stats-strip">
        <div className="stat-item">
          <div className="stat-value">{sortedCards.length}</div>
          <div className="stat-label">My Cards</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{sortedCards.filter(c => c.visibility === "public").length}</div>
          <div className="stat-label">Public</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{sortedCards.filter(c => c.share_status === "pending").length}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{favoriteCards.length}</div>
          <div className="stat-label">Favorites</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: "var(--accent)", fontSize: "0.9rem" }}>
            {profile.role}
          </div>
          <div className="stat-label">Role · Lv {profile.level}</div>
        </div>
      </div>

      <div className="row g-4">
        {/* Left column: Profile + Create/Edit */}
        <div className="col-lg-5">
          {/* Profile */}
          <div className="tc-panel">
            <div className="tc-panel-header">
              <div className="tc-panel-icon">👤</div>
              <h3 className="tc-panel-title">My Profile</h3>
            </div>
            <form onSubmit={saveProfile}>
              <div className="row g-3">
                <div className="col-6">
                  <div className="form-group">
                    <label className="form-label">First name</label>
                    <input className="form-control" value={profile.first_name}
                      onChange={(e) => setProfile(p => ({ ...p, first_name: e.target.value }))} />
                  </div>
                </div>
                <div className="col-6">
                  <div className="form-group">
                    <label className="form-label">Last name</label>
                    <input className="form-control" value={profile.last_name}
                      onChange={(e) => setProfile(p => ({ ...p, last_name: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-control" value={profile.username}
                  onChange={(e) => setProfile(p => ({ ...p, username: e.target.value }))} />
              </div>
              <button disabled={savingProfile} type="submit" className="btn-tc btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                {savingProfile ? <><span className="tc-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving…</> : "Save Profile"}
              </button>
            </form>
          </div>

          {/* Create / Edit form */}
          <div className="tc-panel">
            <div className="tc-panel-header">
              <div className="tc-panel-icon">{editingId ? "✏️" : "➕"}</div>
              <h3 className="tc-panel-title">{editingId ? "Edit Resource" : "Add Resource"}</h3>
            </div>
            <form onSubmit={saveCard}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. The Rust Book" />
              </div>
              <div className="form-group">
                <label className="form-label">Short description</label>
                <textarea className="form-control" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="Brief description of the resource" style={{ minHeight: 70 }} />
              </div>
              <div className="form-group">
                <label className="form-label">URL *</label>
                <input className="form-control" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} required placeholder="https://example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={saving} type="submit" className="btn-tc btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                  {saving ? <><span className="tc-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving…</> : editingId ? "Save changes" : "Create card"}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="btn-tc btn-ghost" disabled={saving}>Cancel</button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right column: My cards */}
        <div className="col-lg-7">
          <div className="section-header">
            <h2 className="section-title">My Cards</h2>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{sortedCards.length} total</span>
          </div>

          {sortedCards.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">No cards yet</div>
              <div className="empty-state-desc">Add your first resource using the form.</div>
            </div>
          ) : (
            <div>
              {sortedCards.map((c) => {
                const canRequest = c.visibility === "private" && ["none","denied","duplicate"].includes(c.share_status);
                return (
                  <div key={c.id} className="my-card-item">
                    <img src={getThumbnailUrl(c)} alt={c.title} className="my-card-thumb" />
                    <div className="my-card-info">
                      <div style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.id}</div>
                      <div className="my-card-title">{c.title}</div>
                      {c.short_description && (
                        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 3, marginBottom: 6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{c.short_description}</div>
                      )}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        <span className="badge-tc badge-category">{c.category}</span>
                        <span className={`badge-tc ${c.visibility === "public" ? "badge-public" : "badge-private"}`}>{c.visibility}</span>
                        {shareStatusBadge(c)}
                      </div>
                      <a href={c.link_url} target="_blank" rel="noreferrer" className="btn-open-link" style={{ fontSize: "0.75rem", padding: "4px 8px" }}>Open ↗</a>
                    </div>
                    <div className="my-card-actions">
                      <button onClick={() => startEdit(c)} className="btn-tc btn-ghost btn-sm">✏️ Edit</button>
                      <button onClick={() => removeCard(c.id)} className="btn-tc btn-danger btn-sm">🗑 Delete</button>
                      {canRequest ? (
                        <button onClick={() => requestShare(c.id)} className="btn-tc btn-success btn-sm">📤 Publish</button>
                      ) : c.share_status === "pending" ? (
                        <button disabled className="btn-tc btn-warning btn-sm">⏳ Pending</button>
                      ) : c.visibility === "public" ? (
                        <button disabled className="btn-tc btn-ghost btn-sm">🌐 Public</button>
                      ) : null}

                      <label className="file-input-label" style={{ fontSize: "0.75rem", padding: "6px 10px" }}>
                        📷 {uploadingForId === c.id ? "Uploading…" : "Custom image"}
                        <input type="file" accept="image/png,image/jpeg,image/webp"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadThumbnailForCard(c.id, f); e.target.value = ""; }}
                          disabled={uploadingForId === c.id} />
                      </label>

                      {c.thumbnail_source === "custom" && (
                        <button onClick={() => removeThumbnailOverride(c)} disabled={uploadingForId === c.id} className="btn-tc btn-ghost btn-sm">✕ Remove image</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Favorites */}
          <hr className="tc-divider" style={{ marginTop: 32 }} />
          <div className="section-header">
            <h2 className="section-title">My Favorites</h2>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{favoriteCards.length} saved</span>
          </div>

          {favLoading ? (
            <div className="tc-loading-page" style={{ minHeight: 120 }}>
              <div className="tc-spinner" /><span>Loading favorites…</span>
            </div>
          ) : favoriteCards.length === 0 ? (
            <div className="empty-state" style={{ padding: "32px 20px" }}>
              <div className="empty-state-icon">☆</div>
              <div className="empty-state-title">No favorites yet</div>
              <div className="empty-state-desc">Star resources in Browse to save them here.</div>
            </div>
          ) : (
            <div>
              {favoriteCards.map((c) => (
                <div key={c.id} className="my-card-item">
                  <img src={getThumbnailUrl(c)} alt={c.title} className="my-card-thumb" />
                  <div className="my-card-info">
                    <div className="my-card-title">{c.title}</div>
                    {c.short_description && <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 3, marginBottom: 6 }}>{c.short_description}</div>}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      <span className="badge-tc badge-category">{c.category}</span>
                      <span className={`badge-tc ${c.visibility === "public" ? "badge-public" : "badge-private"}`}>{c.visibility}</span>
                    </div>
                    <a href={c.link_url} target="_blank" rel="noreferrer" className="btn-open-link" style={{ fontSize: "0.75rem", padding: "4px 8px" }}>Open ↗</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
