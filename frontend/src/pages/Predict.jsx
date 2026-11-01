import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import ContributionChart from "../components/ContributionChart.jsx";
import ProbabilityBars from "../components/ProbabilityBars.jsx";
import { EmptyState, ErrorBox, Loading, Note, PageHeader } from "../components/States.jsx";
import useFetch from "../hooks/useFetch.js";
import { LEADS, PREDICTORS, fmt } from "../lib/constants.js";
 
const EMPTY = Object.fromEntries(PREDICTORS.map((p) => [p.key, ""]));
 
export default function Predict() {
  const [lead, setLead] = useState(3);
  const [values, setValues] = useState(EMPTY);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const status = useFetch("/api/predict/status");
  const samples = useFetch(`/api/predict/samples/${lead}`);
 
  const ready = useMemo(
    () => status.data?.models.find((m) => m.lead_time === lead)?.ready ?? false,
    [status.data, lead]
  );
 
  useEffect(() => setResult(null), [lead]);
 
  const loadSeason = (season) => {
    const row = samples.data?.find((s) => s.season === season);
    if (!row) return;
    setValues(Object.fromEntries(PREDICTORS.map((p) => [p.key, String(row[p.key])])));
    setResult(null);
  };
 
  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    const body = { lead_time: lead };
    for (const p of PREDICTORS) {
      const n = Number(values[p.key]);
      if (values[p.key].trim() === "" || Number.isNaN(n)) {
        setError(new Error(`Enter a numeric value for ${p.full}.`));
        return;
      }
      body[p.key] = n;
    }
    setBusy(true);
    try {
      setResult(await api.post("/api/predict", body));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
 
  const isExtreme = result?.predicted_class === "Extreme El Niño";
 
  return (
    <>
      <PageHeader
        title="Extreme El Niño prediction"
        subtitle="Enter the five predictor anomalies observed at the chosen lead time before the DJF season."
      />
      {status.error && <ErrorBox error={status.error} onRetry={status.reload} />}
      <div className="grid-2">
        <form className="card" onSubmit={submit} aria-describedby="predict-help">
          <fieldset>
            <legend>Lead time</legend>
            <div className="segmented" role="radiogroup" aria-label="Lead time in months">
              {LEADS.map((l) => (
                <label key={l} className={lead === l ? "seg active" : "seg"}>
                  <input type="radio" name="lead" value={l} checked={lead === l} onChange={() => setLead(l)} />
                  {l} months
                </label>
              ))}
            </div>
          </fieldset>
 
          {!status.loading && !ready && (
            <div className="alert alert-warn" role="status">
              The {lead}-month model is not trained yet. Run <code>python -m ml.train</code> in the backend, or ask an
              admin to start training.
            </div>
          )}
 
          <fieldset>
            <legend>Predictors</legend>
            <p id="predict-help" className="muted">
              Values are monthly anomalies (IOD is the Dipole Mode Index). Use the same units as the master dataset.
            </p>
            <div className="field">
              <label htmlFor="season">Load a historical season (optional)</label>
              <select id="season" defaultValue="" onChange={(e) => loadSeason(e.target.value)} disabled={!samples.data?.length}>
                <option value="">{samples.data?.length ? "Select a DJF season…" : "Available after training"}</option>
                {samples.data?.map((s) => (
                  <option key={s.season} value={s.season}>
                    {s.season} — {s.label_name}
                  </option>
                ))}
              </select>
            </div>
            {PREDICTORS.map((p) => (
              <div className="field" key={p.key}>
                <label htmlFor={p.key}>
                  {p.full} <span className="muted">({p.name})</span>
                </label>
                <input
                  id={p.key}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  required
                  value={values[p.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [p.key]: e.target.value }))}
                />
              </div>
            ))}
          </fieldset>
 
          <ErrorBox error={error} />
          <button type="submit" className="btn btn-primary" disabled={busy || !ready}>
            {busy ? "Predicting…" : "Predict"}
          </button>
        </form>
 
        <section className="card" aria-live="polite" aria-label="Prediction result">
          {busy && <Loading label="Running model and SHAP explanation…" />}
          {!busy && !result && (
            <EmptyState title="No prediction yet">
              Choose a lead time, enter the five predictors and select Predict.
            </EmptyState>
          )}
          {!busy && result && (
            <>
              <h2>Result — {result.lead_time}-month lead time</h2>
              <p className={isExtreme ? "badge badge-extreme" : result.predicted_class === "Normal El Niño" ? "badge badge-normal" : "badge"}>{result.predicted_class}</p>
              <h3>Class probabilities</h3>
              <ProbabilityBars probabilities={result.probabilities} predicted={result.predicted_class} />
              <h3>SHAP contribution to the Extreme El Niño class</h3>
              <ContributionChart contributions={result.contributions} field="shap_extreme" />
              <table>
                <caption className="sr-only">Predictor values and SHAP contributions</caption>
                <thead>
                  <tr>
                    <th scope="col">Predictor</th>
                    <th scope="col" className="num">Input</th>
                    <th scope="col" className="num">SHAP (Extreme)</th>
                    <th scope="col" className="num">SHAP ({result.predicted_class})</th>
                  </tr>
                </thead>
                <tbody>
                  {result.contributions.map((c) => (
                    <tr key={c.feature}>
                      <th scope="row">{c.label}</th>
                      <td className="num">{fmt(c.value)}</td>
                      <td className="num">{fmt(c.shap_extreme)}</td>
                      <td className="num">{fmt(c.shap_predicted)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Note>
                Positive SHAP values push the model towards Extreme El Niño; negative values push away from it. The model
                was trained on only three Extreme El Niño seasons, so treat the output as a research indication.
              </Note>
            </>
          )}
        </section>
      </div>
    </>
  );
}

