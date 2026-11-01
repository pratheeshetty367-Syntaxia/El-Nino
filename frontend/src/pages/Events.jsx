import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ErrorBox, Loading, Note, PageHeader } from "../components/States.jsx";
import useFetch from "../hooks/useFetch.js";
import { LEADS, PREDICTORS, fmt, predictorName } from "../lib/constants.js";
 
export default function Events() {
  const published = useFetch("/api/research/published");
  const computed = useFetch("/api/research/computed");
  const [lead, setLead] = useState(12);
 
  if (published.loading || computed.loading) return <Loading />;
  if (published.error) return <ErrorBox error={published.error} onRetry={published.reload} />;
 
  const events = published.data.events;
  const training = computed.data?.training;
  const chartData = training
    ? Object.entries(training.leads[String(lead)].events).map(([event, e]) => ({
        event,
        ...Object.fromEntries(PREDICTORS.map((p) => [p.name, Number(e.shares[p.key].toFixed(1))])),
      }))
    : [];
 
  return (
    <>
      <PageHeader
        title="Historical Extreme El Niño events"
        subtitle="Dominant predictor and its percentage contribution for the 1982/83, 1997/98 and 2015/16 events."
      />
      <section className="card">
        <h2>Table III — dominant predictor by event and lead time</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Lead time</th>
                {events.map((e) => (
                  <th key={e.event} scope="col">{e.event}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LEADS.map((l) => (
                <tr key={l}>
                  <th scope="row">{l} M</th>
                  {events.map((e) => (
                    <td key={e.event}>
                      {e.by_lead[l].predictor} ({e.by_lead[l].percent}%)
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Note>{published.data.notes.events}</Note>
        <p>
          At 3 and 6 months the three events behave alike (SST, then OHC). They diverge from 9 months: 1997/98 is mainly
          OHC-driven while 1982/83 and 2015/16 are Wind-driven. At 12 months Tropical Atlantic SST is the main precursor
          only for 1982/83.
        </p>
      </section>
 
      <section className="card">
        <div className="card-head">
          <h2>Recomputed predictor shares (this app)</h2>
          <div className="segmented" role="radiogroup" aria-label="Lead time">
            {LEADS.map((l) => (
              <label key={l} className={lead === l ? "seg active" : "seg"}>
                <input type="radio" name="evlead" checked={lead === l} onChange={() => setLead(l)} />
                {l} M
              </label>
            ))}
          </div>
        </div>
        {!training ? (
          <p className="muted">Available after running training on your master dataset.</p>
        ) : (
          <>
            <div role="img" aria-label="Stacked bar chart of predictor shares per event" style={{ height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="event" />
                  <YAxis unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Legend />
                  {PREDICTORS.map((p) => (
                    <Bar key={p.key} dataKey={p.name} stackId="s" fill={p.color} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table>
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Dominant predictor</th>
                  <th scope="col" className="num">Share</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(training.leads[String(lead)].events).map(([event, e]) => (
                  <tr key={event}>
                    <th scope="row">{event}</th>
                    <td>{predictorName(e.dominant)}</td>
                    <td className="num">{fmt(e.share, 1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </>
  );
}
