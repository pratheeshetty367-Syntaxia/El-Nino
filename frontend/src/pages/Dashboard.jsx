import { Link } from "react-router-dom";
import { EmptyState, ErrorBox, Loading } from "../components/States.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import useFetch from "../hooks/useFetch.js";
import { PREDICTORS, formatDate } from "../lib/constants.js";
 
export default function Dashboard() {
  const { user } = useAuth();
  const published = useFetch("/api/research/published");
  const status = useFetch("/api/predict/status");
  const history = useFetch("/api/history?limit=5");
 
  if (published.loading) return <Loading />;
  if (published.error) return <ErrorBox error={published.error} onRetry={published.reload} />;
 
  const { dataset, performance, shap_importance } = published.data;
  const best = performance[0];
  const dominant = ["3", "6", "9", "12"].map((l) => {
    const top = shap_importance.predictors.find((p) => p.ranks[l] === 1);
    return { lead: l, name: top.name, color: PREDICTORS.find((q) => q.key === top.key)?.color };
  });
  const ready = status.data?.models.filter((m) => m.ready).length ?? 0;
 
  return (
    <>
      <section className="hero">
        <h1>{`Welcome, ${user.full_name.split(" ")[0]}`}</h1>
        <p>Explainable lead-time analysis of oceanic predictors for Extreme El Niño classification.</p>
      </section>
 
      <section className="stat-grid" aria-label="Key figures from the study">
        <div className="stat">
          <span className="stat-value">{dataset.seasons}</span>
          <span className="stat-label">labelled DJF seasons (30 / 12 / 3)</span>
        </div>
        <div className="stat">
          <span className="stat-value">{best.accuracy}%</span>
          <span className="stat-label">LOOCV accuracy at 3 months, precision 1.00</span>
        </div>
        <div className="stat">
          <span className="stat-value">5</span>
          <span className="stat-label">oceanic predictors, 4 lead times</span>
        </div>
        <div className="stat">
          <span className="stat-value">{status.loading ? "…" : `${ready}/4`}</span>
          <span className="stat-label">models trained and ready</span>
        </div>
      </section>
 
      <div className="grid-2">
        <section className="card">
          <h2>Dominant predictor by lead time</h2>
          <ol className="lead-chain">
            {dominant.map((d) => (
              <li key={d.lead} style={{ borderColor: d.color, background: `${d.color}1f` }}>
                <strong>{d.lead} months</strong>
                <span>{d.name}</span>
              </li>
            ))}
          </ol>
          <p className="muted">
            Importance shifts from surface conditions (SST) to subsurface heat (OHC), wind forcing and finally
            cross-basin Tropical Atlantic SST as lead time increases.
          </p>
          <Link className="btn btn-secondary" to="/importance">
            View predictor importance
          </Link>
        </section>
 
        <section className="card">
          <h2>Quick actions</h2>
          <ul className="link-list">
            <li><Link to="/predict">Run a new prediction</Link></li>
            <li><Link to="/events">Compare the 1982/83, 1997/98 and 2015/16 events</Link></li>
            <li><Link to="/models">Compare XGBoost with five other classifiers</Link></li>
            <li><Link to="/dataset">Explore the dataset</Link></li>
            <li><Link to="/methodology">Read the research methodology</Link></li>
          </ul>
        </section>
      </div>
 
      <section className="card">
        <h2>Recent predictions</h2>
        {history.loading && <Loading />}
        {history.error && <ErrorBox error={history.error} onRetry={history.reload} />}
        {history.data && history.data.items.length === 0 && (
          <EmptyState title="No predictions yet">
            <Link to="/predict">Make your first prediction</Link>
          </EmptyState>
        )}
        {history.data && history.data.items.length > 0 && (
          <table>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Lead time</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {history.data.items.map((p) => (
                <tr key={p.id}>
                  <td>{formatDate(p.created_at)}</td>
                  <td>{p.lead_time} M</td>
                  <td>{p.predicted_class}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
