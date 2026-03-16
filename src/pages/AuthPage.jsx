import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/dashboard");
    });
  }, [navigate]);

  const showMsg = (text, type = "info") => {
    setMessage(text);
    setMessageType(type);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;

        if (!data.session) {
          showMsg("Account created! Please check your email to confirm, then log in.", "success");
        } else {
          navigate("/dashboard");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (err) {
      showMsg(err?.message || "Something went wrong", "danger");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-box animate-in">
        <div className="auth-logo">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
            <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
              <rect x="1" y="1" width="8" height="8" rx="2" fill="#4f8eff"/>
              <rect x="11" y="1" width="8" height="8" rx="2" fill="#4f8eff" opacity="0.5"/>
              <rect x="1" y="11" width="8" height="8" rx="2" fill="#4f8eff" opacity="0.5"/>
              <rect x="11" y="11" width="8" height="8" rx="2" fill="#4f8eff"/>
            </svg>
          </div>
          <div className="auth-logo-text">TechCards</div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => { setMode("login"); setMessage(""); }}
          >
            Sign in
          </button>
          <button
            className={`auth-tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => { setMode("signup"); setMessage(""); }}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={6}
              placeholder="Min. 6 characters"
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="btn-tc btn-primary w-100"
            style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}
          >
            {loading ? (
              <>
                <span className="tc-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                Please wait…
              </>
            ) : (
              mode === "signup" ? "Create account" : "Sign in"
            )}
          </button>
        </form>

        {message && (
          <div className={`tc-alert tc-alert-${messageType}`} style={{ marginTop: 16 }}>
            {message}
          </div>
        )}

        {mode === "signup" && (
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "16px", textAlign: "center" }}>
            Email confirmation is required. After signing up, check your inbox and confirm before signing in.
          </p>
        )}
      </div>
    </div>
  );
}
