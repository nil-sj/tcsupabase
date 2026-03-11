import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If already logged in, go to dashboard
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/dashboard");
    });
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
          },
        });
        if (error) throw error;

        // With confirm email ON, session will often be null until user confirms
        if (!data.session) {
          setMessage("✅ Signup successful! Please check your email to confirm your account, then log in.");
        } else {
          setMessage("✅ Signed in!");
          navigate("/dashboard");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        setMessage("✅ Logged in!");
        navigate("/dashboard");
      }
    } catch (err) {
      setMessage("❌ " + (err?.message || "Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420 }}>
      <h2>{mode === "signup" ? "Sign up" : "Login"}</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => {
            setMode("login");
            setMessage("");
          }}
          disabled={mode === "login"}
        >
          Login
        </button>
        <button
          onClick={() => {
            setMode("signup");
            setMessage("");
          }}
          disabled={mode === "signup"}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            placeholder="you@example.com"
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={6}
            placeholder="min 6 characters"
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <button disabled={loading} type="submit" style={{ padding: 10 }}>
          {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Login"}
        </button>

        {message && (
          <div style={{ padding: 10, background: "#f6f6f6", borderRadius: 8 }}>
            {message}
          </div>
        )}
      </form>

      <p style={{ marginTop: 16, fontSize: 13, opacity: 0.8 }}>
        Note: Email confirmation is enabled. After signup, confirm from your inbox, then return and log in.
      </p>
    </div>
  );
}