import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
 
export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
 
  if (user) return <Navigate to="/" replace />;
 
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
 
  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      await register(form.full_name, form.email, form.password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
 
  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>Create account</h1>
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="full_name">Full name</label>
            <input id="full_name" autoComplete="name" required minLength={2} value={form.full_name} onChange={set("full_name")} />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              aria-describedby="pw-hint"
              value={form.password}
              onChange={set("password")}
            />
            <small id="pw-hint" className="muted">
              At least 8 characters.
            </small>
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirm password</label>
            <input id="confirm" type="password" autoComplete="new-password" required value={form.confirm} onChange={set("confirm")} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="auth-switch">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
