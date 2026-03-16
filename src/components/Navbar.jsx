import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="tc-navbar">
      {/* Brand */}
      <Link to="/" className="tc-navbar-brand">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="8" height="8" rx="2" fill="#4f8eff"/>
          <rect x="11" y="1" width="8" height="8" rx="2" fill="#4f8eff" opacity="0.5"/>
          <rect x="1" y="11" width="8" height="8" rx="2" fill="#4f8eff" opacity="0.5"/>
          <rect x="11" y="11" width="8" height="8" rx="2" fill="#4f8eff"/>
        </svg>
        TechCards
        <span className="brand-badge">Beta</span>
      </Link>

      {/* Desktop nav links */}
      <div className="tc-nav-links d-none d-md-flex">
        <Link to="/" className={`tc-nav-link ${isActive("/") ? "active" : ""}`}>Home</Link>
        <Link to="/browse" className={`tc-nav-link ${isActive("/browse") ? "active" : ""}`}>Browse</Link>
        <Link to="/about" className={`tc-nav-link ${isActive("/about") ? "active" : ""}`}>About</Link>
        <Link to="/contact" className={`tc-nav-link ${isActive("/contact") ? "active" : ""}`}>Contact</Link>
        {session && (
          <Link to="/dashboard" className={`tc-nav-link ${isActive("/dashboard") ? "active" : ""}`}>Dashboard</Link>
        )}
      </div>

      {/* Desktop auth actions */}
      <div className="tc-navbar-actions d-none d-md-flex">
        {!session ? (
          <Link to="/auth" className="btn-tc btn-primary btn-sm">
            Sign in
          </Link>
        ) : (
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {session.user.email.split("@")[0]}
            </span>
            <button onClick={logout} className="btn-tc btn-ghost btn-sm">
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Mobile hamburger */}
      <button
        className="d-md-none btn-tc btn-ghost btn-sm"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
        style={{ padding: "6px 10px" }}
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
          <path d="M1 1h16M1 7h16M1 13h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          style={{
            position: "fixed",
            top: "60px",
            left: 0,
            right: 0,
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--border)",
            padding: "12px 16px",
            zIndex: 99,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <Link to="/" className="tc-nav-link" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link to="/browse" className="tc-nav-link" onClick={() => setMenuOpen(false)}>Browse</Link>
            <Link to="/about" className="tc-nav-link" onClick={() => setMenuOpen(false)}>About</Link>
            <Link to="/contact" className="tc-nav-link" onClick={() => setMenuOpen(false)}>Contact</Link>
            {session && (
              <Link to="/dashboard" className="tc-nav-link" onClick={() => setMenuOpen(false)}>Dashboard</Link>
            )}
            <hr style={{ borderColor: "var(--border)", margin: "8px 0" }} />
            {!session ? (
              <Link to="/auth" className="btn-tc btn-primary" onClick={() => setMenuOpen(false)}>Sign in</Link>
            ) : (
              <button onClick={() => { logout(); setMenuOpen(false); }} className="btn-tc btn-ghost">Sign out</button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
