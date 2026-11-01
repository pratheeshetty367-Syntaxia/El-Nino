import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import DominanceTimeline from "../components/DominanceTimeline.jsx";
import Heatmap from "../components/Heatmap.jsx";
import { ErrorBox, Loading } from "../components/States.jsx";
import useFetch from "../hooks/useFetch.js";
import { LEADS, PREDICTORS, predictorName } from "../lib/constants.js";
 
const ROLES = {
  sst_anom: "Surface warming",
  ohc_anom: "Subsurface heat storage",
  wind_anom: "Atmospheric forcing",
  atl_sst_anom: "Cross-basin signal",
  iod_dmi: "Indian Ocean variability",
};
 
export default function Overview() {
  const { data, error, loading, reload } = useFetch("/api/research/published");
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
 
  const { paper, dataset, performance, shap_importance, events } = data;
  const rows = shap_importance.predictors.map((p) => ({
    ...p,
    color: PREDICTORS.find((q) => q.key === p.key)?.color,
  }));
 
  const steps = LEADS.map((l) => {
    const sorted = [...rows].sort((a, b) => b.values[l] - a.values[l]);
    const total = rows.reduce((sum, r) => sum + r.values[l], 0);
    const [top, second] = sorted;
    const tied = (top.values[l] - second.values[l]) / top.values[l] < 0.05;
    return {
      lead: l,
      name: top.name,
      color: top.color,
      role: ROLES[top.key],
      share: top.values[l] / total,
      note: tied ? `Nearly tied with ${second.name}` : null,
    };
  });
 
  const accuracy = performance.map((p) => ({ lead: `${p.lead_time} M`, accuracy: p.accuracy }));
 
  return (
    <>
      <section className="overview-hero">
        <p className="kicker">Research overview</p>
        <h1>{paper.title}</h1>
        <p>
          How does the importance of oceanic predictors change as the forecast horizon grows? An explainable XGBoost +
          SHAP study of {dataset.seasons} DJF seasons, including {dataset.class_distribution["Extreme El Niño"]} Extreme
          El Niño events.
        </p>
        <p className="authors">{paper.authors.join(" · ")} — {paper.institution}</p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to="/predict">Try a prediction</Link>
          <Link className="btn btn-secondary" to="/importance">Explore predictor importance</Link>
        </div>
      </section>
 
      <section className="stat-grid" aria-label="Study at a glance" style={{ marginTop: "1.25rem" }}>
        <div className="stat"><span className="stat-value">{dataset.records}</span><span className="stat-label">monthly records, {dataset.period}</span></div>
        <div className="stat"><span className="stat-value">5</span><span className="stat-label">oceanic predictors from NOAA</span></div>
        <div className="stat"><span className="stat-value">4</span><span className="stat-label">lead times: 3, 6, 9 and 12 months</span></div>
        <div className="stat"><span className="stat-value">{performance[0].accuracy}%</span><span className="stat-label">best LOOCV accuracy (3 months)</span></div>
      </section>
 
      <section className="card">
        <div className="section-title">
          <h2>The dominant predictor changes with lead time</h2>
          <span className="muted">Mean absolute SHAP value, XGBoost, all classes</span>
        </div>
        <DominanceTimeline steps={steps} />
      </section>
 
      <div className="grid-2">
        <section className="card">
          <h2>Importance by predictor and lead time</h2>
          <Heatmap rows={rows} leads={LEADS} />
        </section>
        <section className="card">
          <h2>LOOCV accuracy by lead time</h2>
          <div role="img" aria-label="Bar chart of accuracy: 3 months 95.6, 6 months 80.0, 9 months 71.1, 12 months 55.6 percent" style={{ height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={accuracy} margin={{ top: 22, right: 12, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="lead" />
                <YAxis domain={[0, 100]} unit="%" />
                <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                  {accuracy.map((a, i) => (
                    <Cell key={a.lead} fill={["#04293a", "#0a5c7a", "#2f9bc4", "#8fcbe0"][i]} />
                  ))}
                  <LabelList dataKey="accuracy" position="top" formatter={(v) => `${v}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="note">{data.notes.performance}</p>
        </section>
      </div>
 
      <section className="card">
        <div className="section-title">
          <h2>Each Extreme El Niño followed its own pathway</h2>
          <span className="muted">Dominant predictor at 3 → 6 → 9 → 12 months (highlighted where it differs)</span>
        </div>
        {events.map((e) => (
          <div className="path-row" key={e.event}>
            <span className="path-event">{e.event}</span>
            {LEADS.map((l, i) => {
              const name = e.by_lead[l].predictor;
              const differs = events.some((o) => o.by_lead[l].predictor !== name);
              return (
                <span key={l} style={{ display: "contents" }}>
                  {i > 0 && <span className="path-arrow" aria-hidden="true">→</span>}
                  <span className={differs ? "path-chip differs" : "path-chip"} title={`${l} months`}>
                    {name} <span className="muted">{e.by_lead[l].percent}%</span>
                  </span>
                </span>
              );
            })}
          </div>
        ))}
      </section>
 
      <section className="card">
        <h2>Key takeaways</h2>
        <ul className="takeaways">
          <li>Short-range classification relies almost entirely on {predictorName("sst_anom")}; longer ranges draw on subsurface heat, wind and Tropical Atlantic signals.</li>
          <li>The 3-month model reached {performance[0].accuracy}% accuracy with no false alarms for the Extreme class; accuracy fell to {performance[3].accuracy}% at 12 months.</li>
          <li>The three historical events agree at short leads and diverge at 9 and 12 months — a pattern hidden in the overall ranking.</li>
          <li>With only three Extreme events, the findings are descriptive rather than statistically conclusive.</li>
        </ul>
      </section>
    </>
  );
}

