import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Alert({ msg }) {
  if (!msg) return null;
  const isSuccess = msg.startsWith("✅");
  const isError = msg.startsWith("❌");
  const type = isSuccess ? "success" : isError ? "danger" : "info";
  return <div className={`tc-alert tc-alert-${type}`}>{msg}</div>;
}

export default function Contact() {
  const [session, setSession] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [messageText, setMessageText] = useState("");
  const [contactMsg, setContactMsg] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [issue, setIssue] = useState("");
  const [reportMsg, setReportMsg] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const submitContact = async (e) => {
    e.preventDefault();
    setContactMsg("");
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess?.session?.user?.id || null;
    const { error } = await supabase.from("contact_messages").insert({
      user_id: userId, name: name.trim() || null, email: email.trim() || null, message: messageText.trim(),
    });
    if (error) { setContactMsg("❌ " + error.message); return; }
    setContactMsg("✅ Message sent! We'll get back to you soon.");
    setName(""); setEmail(""); setMessageText("");
  };

  const submitReport = async (e) => {
    e.preventDefault();
    setReportMsg("");
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess?.session?.user?.id || null;
    const { error } = await supabase.from("resource_reports").insert({
      user_id: userId, resource_id: resourceId.trim() || null, issue: issue.trim(),
    });
    if (error) { setReportMsg("❌ " + error.message); return; }
    setReportMsg("✅ Report submitted — thank you!");
    setResourceId(""); setIssue("");
  };

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: "1.6rem", marginBottom: "6px" }}>Get in touch</h1>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          {session ? `Logged in as ${session.user.email}` : "You can reach us while logged out too."}
        </p>
      </div>

      <div className="contact-grid">
        {/* Contact form */}
        <div className="tc-panel">
          <div className="tc-panel-header">
            <div className="tc-panel-icon">💬</div>
            <h3 className="tc-panel-title">Send a message</h3>
          </div>
          <form onSubmit={submitContact}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="form-group">
              <label className="form-label">Email (optional)</label>
              <input className="form-control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Message *</label>
              <textarea className="form-control" value={messageText} onChange={(e) => setMessageText(e.target.value)} required placeholder="What's on your mind?" style={{ minHeight: 100 }} />
            </div>
            <button type="submit" className="btn-tc btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              Send message
            </button>
            <Alert msg={contactMsg} />
          </form>
        </div>

        {/* Report form */}
        <div className="tc-panel">
          <div className="tc-panel-header">
            <div className="tc-panel-icon">🚩</div>
            <h3 className="tc-panel-title">Report an issue</h3>
          </div>
          <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)", marginBottom: 16 }}>
            Found a broken link, wrong category, or duplicate? Include the Resource ID shown on the card if possible.
          </p>
          <form onSubmit={submitReport}>
            <div className="form-group">
              <label className="form-label">Resource ID (optional)</label>
              <input className="form-control" value={resourceId} onChange={(e) => setResourceId(e.target.value)} placeholder="e.g. 2b7b…-uuid" style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }} />
            </div>
            <div className="form-group">
              <label className="form-label">Describe the issue *</label>
              <textarea className="form-control" value={issue} onChange={(e) => setIssue(e.target.value)} required placeholder="Broken link? Wrong category? Duplicate? Spam?" style={{ minHeight: 100 }} />
            </div>
            <button type="submit" className="btn-tc btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
              Submit report
            </button>
            <Alert msg={reportMsg} />
          </form>
        </div>
      </div>
    </div>
  );
}
