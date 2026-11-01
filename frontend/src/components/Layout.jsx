import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
 
const LINKS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/overview", label: "Overview" },
  { to: "/predict", label: "Predict" },
  { to: "/importance", label: "Predictor importance" },
  { to: "/events", label: "Historical events" },
  { to: "/models", label: "Model comparison" },
  { to: "/dataset", label: "Dataset" },
  { to: "/history", label: "History" },
  { to: "/methodology", label: "Methodology" },
];
 
export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const canAdmin = user && (user.role === "admin" || user.role === "researcher");
 
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
 
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand">
            Extreme El Niño <span>XAI</span>
          </NavLink>
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="main-nav"
            onClick={() => setOpen((o) => !o)}
          >
            Menu
          </button>
          <nav id="main-nav" className={open ? "nav open" : "nav"} aria-label="Main">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))}
            {canAdmin && (
              <NavLink to="/admin" onClick={() => setOpen(false)}>
                Admin
              </NavLink>
            )}
            <div className="nav-user">
              <span className="muted" title={user?.email}>
                {user?.full_name}
              </span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          </nav>
        </div>
      </header>
      <main id="main" className="container">
        <Outlet />
      </main>
      <footer className="footer">
        <p>
          Research tool based on 45 labelled DJF seasons (1981–2025) with only three Extreme El Niño events. Results are
          descriptive and not an operational forecast.
        </p>
      </footer>
    </>
  );
}
