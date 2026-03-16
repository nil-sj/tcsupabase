export default function About() {
  const features = [
    { icon: "🔒", title: "Private by default", desc: "Save resources privately. They're only visible to you until you choose to publish." },
    { icon: "🌐", title: "Public library", desc: "Submit resources for admin review. Accepted cards join the shared community library." },
    { icon: "⭐", title: "Vote & favorite", desc: "Upvote quality resources and star your favorites to revisit later." },
    { icon: "🗂️", title: "10 categories", desc: "Organized across Articles, Books, Courses, YouTube, GitHub, Cheat Sheets, and more." },
    { icon: "🔍", title: "Duplicate detection", desc: "Admins check for URL-level duplicates to keep the library clean." },
    { icon: "🖼️", title: "Custom thumbnails", desc: "Upload a custom image for any card, or use smart category defaults." },
  ];

  return (
    <div className="about-wrapper">
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(79,142,255,0.1)", border: "1px solid rgba(79,142,255,0.2)", borderRadius: 6, padding: "4px 12px", fontSize: "0.78rem", color: "var(--accent)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 16 }}>
          About TechCards
        </div>
        <h1 style={{ fontSize: "1.8rem", marginBottom: 14 }}>
          Your personal tech<br />resource library
        </h1>
        <p style={{ fontSize: "1rem", color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 520 }}>
          TechCards lets you collect and organize tech learning resources privately, then optionally share the best ones with the community. Admins review submissions to maintain quality.
        </p>
      </div>

      {/* How it works */}
      <div className="tc-panel">
        <div className="tc-panel-header">
          <div className="tc-panel-icon">⚙️</div>
          <h3 className="tc-panel-title">How it works</h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            ["1", "Create an account", "Sign up and start adding resources to your private library immediately."],
            ["2", "Add resources", "Save articles, books, courses, repos, podcasts and more — with URL, title, and description."],
            ["3", "Request to publish", "Found something great? Submit it for admin review to add it to the public library."],
            ["4", "Admins review", "Admins check for quality and duplicates, then accept, deny, or flag the submission."],
          ].map(([num, title, desc]) => (
            <div key={num} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, background: "var(--accent)", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>{num}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: "0.83rem", color: "var(--text-secondary)" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="feature-grid">
        {features.map((f) => (
          <div key={f.title} className="feature-item">
            <div className="feature-icon">{f.icon}</div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
