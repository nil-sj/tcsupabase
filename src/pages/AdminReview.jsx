import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { isAdmin } from "../lib/isAdmin";

export default function AdminReview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [adminOk, setAdminOk] = useState(false);
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState("info");
  const [requests, setRequests] = useState([]);
  const [notes, setNotes] = useState({});
  const [dupLookup, setDupLookup] = useState({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate("/auth"); return; }
      const ok = await isAdmin();
      setAdminOk(ok);
      if (ok) await loadPending();
      setLoading(false);
    })();
  }, [navigate]);

  const showMsg = (text, type = "info") => { setMessage(text); setMsgType(type); };

  const loadPending = async () => {
    setMessage("");
    const { data, error } = await supabase
      .from("resource_share_requests")
      .select(`id,status,created_at,resource_id,requester_id,resource_cards:resource_id(id,title,short_description,link_url,url_normalized,category,visibility,share_status,created_at)`)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) { showMsg("Failed to load requests: " + error.message, "danger"); setRequests([]); return; }
    setRequests(data || []);
  };

  const checkDuplicates = async (resource) => {
    const rid = resource.id;
    setDupLookup((prev) => ({ ...prev, [rid]: { loading: true, items: [] } }));
    const { data, error } = await supabase
      .from("resource_cards").select("id,title,link_url,created_at")
      .eq("visibility", "public").eq("url_normalized", resource.url_normalized)
      .neq("id", rid).limit(5);
    setDupLookup((prev) => ({ ...prev, [rid]: { loading: false, items: error ? [] : (data || []) } }));
  };

  const decide = async (requestId, decision, resource) => {
    setMessage("");
    const adminNotes = notes[requestId] || "";
    const dupItems = dupLookup[resource.id]?.items || [];
    const duplicateOf = decision === "duplicate" ? (dupItems[0]?.id || null) : null;

    const { error } = await supabase.rpc("review_share_request", {
      p_request_id: requestId, p_decision: decision,
      p_admin_notes: adminNotes, p_duplicate_of_resource_id: duplicateOf,
    });

    if (error) { showMsg("Review failed: " + error.message, "danger"); return; }
    showMsg(`Marked as ${decision}`, "success");
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  if (loading) return <div className="tc-loading-page"><div className="tc-spinner" /><span>Checking permissions…</span></div>;

  if (!adminOk) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <div style={{ fontSize: "2rem", marginBottom: "16px" }}>🚫</div>
        <h2>Access Denied</h2>
        <p style={{ color: "var(--text-secondary)" }}>You need admin privileges to view this page.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", marginBottom: "4px" }}>Admin Review</h1>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>
              {requests.length} pending {requests.length === 1 ? "request" : "requests"}
            </p>
          </div>
          <button onClick={loadPending} className="btn-tc btn-ghost btn-sm">↻ Refresh</button>
        </div>
      </div>

      {message && (
        <div className={`tc-alert tc-alert-${msgType}`}>{message}</div>
      )}

      {requests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎉</div>
          <div className="empty-state-title">All caught up!</div>
          <div className="empty-state-desc">No pending share requests.</div>
        </div>
      ) : (
        <div>
          {requests.map((r) => {
            const resource = r.resource_cards;
            const dupState = dupLookup[resource.id];
            const dupItems = dupState?.items || [];
            const dupLoading = dupState?.loading;
            const hasDups = dupItems.length > 0;

            return (
              <div key={r.id} className="review-card">
                {/* Request meta */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                    REQ {r.id.slice(0, 8)}… · RES {resource.id.slice(0, 8)}…
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>

                {/* Resource info */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: "1rem", marginBottom: 6 }}>{resource.title}</h3>
                    {resource.short_description && (
                      <p style={{ fontSize: "0.85rem", margin: "0 0 8px", color: "var(--text-secondary)" }}>{resource.short_description}</p>
                    )}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      <span className="badge-tc badge-category">{resource.category}</span>
                      <span className={`badge-tc ${resource.visibility === "public" ? "badge-public" : "badge-private"}`}>{resource.visibility}</span>
                      <span className="badge-tc badge-pending">{resource.share_status}</span>
                    </div>
                    <a href={resource.link_url} target="_blank" rel="noreferrer" className="btn-open-link">
                      Open link ↗
                    </a>
                  </div>
                </div>

                {/* Duplicate check */}
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: dupState ? 10 : 0 }}>
                    <button onClick={() => checkDuplicates(resource)} className="btn-tc btn-ghost btn-sm">
                      🔍 Check for duplicates
                    </button>
                    {dupLoading && <div className="tc-spinner" style={{ width: 14, height: 14 }} />}
                    {!dupLoading && dupState && (
                      <span style={{ fontSize: "0.8rem" }}>
                        {hasDups
                          ? <span style={{ color: "var(--warning)" }}>⚠ {dupItems.length} duplicate(s) found</span>
                          : <span style={{ color: "var(--success)" }}>✓ No duplicates</span>}
                      </span>
                    )}
                  </div>

                  {dupState && !dupLoading && hasDups && (
                    <div className="dup-warning">
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--warning)", marginBottom: 8 }}>Possible duplicates:</div>
                      {dupItems.map((d) => (
                        <div key={d.id} style={{ fontSize: "0.82rem", color: "var(--text-secondary)", display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                          <span style={{ flex: 1 }}>{d.title}</span>
                          <a href={d.link_url} target="_blank" rel="noreferrer" className="btn-open-link" style={{ fontSize: "0.72rem", padding: "3px 8px" }}>open ↗</a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Admin notes */}
                <div style={{ marginTop: 14 }}>
                  <label className="form-label">Admin notes (optional)</label>
                  <textarea
                    className="form-control"
                    value={notes[r.id] || ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="Reason for denial, duplicate notes, etc."
                    style={{ minHeight: 60 }}
                  />
                </div>

                {/* Decision buttons */}
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  <button onClick={() => decide(r.id, "accepted", resource)} className="btn-tc btn-success">
                    ✓ Accept &amp; Publish
                  </button>
                  <button onClick={() => decide(r.id, "denied", resource)} className="btn-tc btn-danger">
                    ✕ Deny
                  </button>
                  <button onClick={() => decide(r.id, "duplicate", resource)} className="btn-tc btn-warning">
                    ⊗ Mark Duplicate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
