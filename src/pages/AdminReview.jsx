import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { isAdmin } from "../lib/isAdmin";

export default function AdminReview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [adminOk, setAdminOk] = useState(false);

  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState([]);

  const [notes, setNotes] = useState({}); // requestId -> notes
  const [dupLookup, setDupLookup] = useState({}); // resourceId -> {loading, items}

  useEffect(() => {
    (async () => {
      // must be logged in
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/auth");
        return;
      }

      const ok = await isAdmin();
      setAdminOk(ok);
      if (!ok) {
        setLoading(false);
        return;
      }

      await loadPending();
      setLoading(false);
    })();
  }, [navigate]);

  const loadPending = async () => {
    setMessage("");

    // Load pending share requests + resource details + requester email
    const { data, error } = await supabase
      .from("resource_share_requests")
      .select(
        `
        id,
        status,
        created_at,
        resource_id,
        requester_id,
        resource_cards:resource_id (
          id,
          title,
          short_description,
          link_url,
          url_normalized,
          category,
          visibility,
          share_status,
          created_at
        )
      `
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      setMessage("❌ Failed to load pending requests: " + error.message);
      setRequests([]);
      return;
    }

    setRequests(data || []);
  };

  const checkDuplicates = async (resource) => {
    const rid = resource.id;
    setDupLookup((prev) => ({ ...prev, [rid]: { loading: true, items: [] } }));

    const { data, error } = await supabase
      .from("resource_cards")
      .select("id,title,link_url,created_at")
      .eq("visibility", "public")
      .eq("url_normalized", resource.url_normalized)
      .neq("id", rid)
      .limit(5);

    if (error) {
      setDupLookup((prev) => ({ ...prev, [rid]: { loading: false, items: [] } }));
      return;
    }

    setDupLookup((prev) => ({ ...prev, [rid]: { loading: false, items: data || [] } }));
  };

  const decide = async (requestId, decision, resource) => {
    setMessage("");

    const adminNotes = notes[requestId] || "";

    // If marking duplicate, try to attach the first detected duplicate if any
    const dupItems = dupLookup[resource.id]?.items || [];
    const duplicateOf = decision === "duplicate" ? (dupItems[0]?.id || null) : null;

    const { data, error } = await supabase.rpc("review_share_request", {
      p_request_id: requestId,
      p_decision: decision,
      p_admin_notes: adminNotes,
      p_duplicate_of_resource_id: duplicateOf,
    });

    if (error) {
      // If admin tried "accepted" but there is a duplicate, function throws an error
      setMessage("❌ Review failed: " + error.message);
      return;
    }

    setMessage(`✅ Marked ${decision}`);
    // remove it from the local list
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  if (loading) return <p>Loading...</p>;

  if (!adminOk) {
    return (
      <div>
        <h2>Admin Review</h2>
        <p>❌ You are not an admin.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Admin Review</h2>
      <p>Pending share requests: {requests.length}</p>

      {message && (
        <div style={{ padding: 10, background: "#f6f6f6", borderRadius: 8, marginBottom: 12 }}>
          {message}
        </div>
      )}

      {requests.length === 0 ? (
        <p>No pending requests 🎉</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {requests.map((r) => {
            const resource = r.resource_cards;
            const dupState = dupLookup[resource.id];
            const dupItems = dupState?.items || [];
            const dupLoading = dupState?.loading;

            return (
              <div key={r.id} style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Request ID: {r.id} • Resource ID: {resource.id}
                </div>

                <div style={{ fontWeight: 700, marginTop: 6 }}>{resource.title}</div>
                {resource.short_description && <div style={{ marginTop: 6 }}>{resource.short_description}</div>}

                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
                  {resource.category} • visibility: {resource.visibility} • share_status: {resource.share_status}
                </div>

                <a href={resource.link_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8 }}>
                  Open link
                </a>

                <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => checkDuplicates(resource)}>
                    Check duplicates (same URL)
                  </button>
                  {dupLoading && <span style={{ fontSize: 12 }}>Checking...</span>}
                  {!dupLoading && dupState && (
                    <span style={{ fontSize: 12 }}>
                      {dupItems.length ? `⚠️ Found ${dupItems.length} duplicate(s)` : "✅ No duplicates found"}
                    </span>
                  )}
                </div>

                {dupState && !dupLoading && dupItems.length > 0 && (
                  <div style={{ marginTop: 8, padding: 10, background: "#fff6e5", borderRadius: 8 }}>
                    <div style={{ fontWeight: 700 }}>Possible duplicates:</div>
                    <ul style={{ margin: "8px 0 0 18px" }}>
                      {dupItems.map((d) => (
                        <li key={d.id}>
                          {d.title} —{" "}
                          <a href={d.link_url} target="_blank" rel="noreferrer">
                            open
                          </a>{" "}
                          <span style={{ fontSize: 12, opacity: 0.7 }}>({d.id})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ marginTop: 10 }}>
                  <label style={{ display: "block", fontSize: 13, opacity: 0.8 }}>
                    Admin notes (optional)
                  </label>
                  <textarea
                    value={notes[r.id] || ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    style={{ width: "100%", padding: 8, marginTop: 4, minHeight: 60 }}
                    placeholder="Reason for denial, duplicate notes, etc."
                  />
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={() => decide(r.id, "accepted", resource)}>Accept → Make Public</button>
                  <button onClick={() => decide(r.id, "denied", resource)}>Deny</button>
                  <button onClick={() => decide(r.id, "duplicate", resource)}>Mark Duplicate</button>
                </div>

                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
                  Submitted: {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}