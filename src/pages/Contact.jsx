import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Contact() {
  const [session, setSession] = useState(null);

  // Contact form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [messageText, setMessageText] = useState("");
  const [contactMsg, setContactMsg] = useState("");

  // Report form
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
      user_id: userId,
      name: name.trim() || null,
      email: email.trim() || null,
      message: messageText.trim(),
    });

    if (error) {
      setContactMsg("❌ " + error.message);
      return;
    }

    setContactMsg("✅ Sent! Thanks.");
    setName("");
    setEmail("");
    setMessageText("");
  };

  const submitReport = async (e) => {
    e.preventDefault();
    setReportMsg("");

    const { data: sess } = await supabase.auth.getSession();
    const userId = sess?.session?.user?.id || null;

    const { error } = await supabase.from("resource_reports").insert({
      user_id: userId,
      resource_id: resourceId.trim() || null,
      issue: issue.trim(),
    });

    if (error) {
      setReportMsg("❌ " + error.message);
      return;
    }

    setReportMsg("✅ Report submitted. Thank you!");
    setResourceId("");
    setIssue("");
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <h2>Contact</h2>
      <p>{session ? "You’re logged in." : "You can submit forms while logged out too."}</p>

      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Contact form</h3>
          <form onSubmit={submitContact} style={{ display: "grid", gap: 10 }}>
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 4 }} />
            </label>

            <label>
              Email (optional)
              <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 4 }} />
            </label>

            <label>
              Message *
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                required
                style={{ width: "100%", padding: 8, marginTop: 4, minHeight: 90 }}
              />
            </label>

            <button type="submit" style={{ padding: 10 }}>
              Send message
            </button>

            {contactMsg && <div style={{ padding: 10, background: "#f6f6f6", borderRadius: 8 }}>{contactMsg}</div>}
          </form>
        </div>

        <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Report / Correction</h3>
          <p style={{ fontSize: 13, opacity: 0.8 }}>
            Please include the Resource ID shown on the card (if you have it).
          </p>
          <form onSubmit={submitReport} style={{ display: "grid", gap: 10 }}>
            <label>
              Resource ID (optional)
              <input
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                placeholder="e.g., 2b7b...-uuid"
                style={{ width: "100%", padding: 8, marginTop: 4 }}
              />
            </label>

            <label>
              Issue *
              <textarea
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                required
                style={{ width: "100%", padding: 8, marginTop: 4, minHeight: 90 }}
                placeholder="What’s wrong? Broken link? Wrong category? Duplicate? etc."
              />
            </label>

            <button type="submit" style={{ padding: 10 }}>
              Submit report
            </button>

            {reportMsg && <div style={{ padding: 10, background: "#f6f6f6", borderRadius: 8 }}>{reportMsg}</div>}
          </form>
        </div>
      </div>
    </div>
  );
}