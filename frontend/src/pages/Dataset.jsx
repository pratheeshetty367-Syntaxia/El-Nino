import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, ErrorBox, Loading, PageHeader } from "../components/States.jsx";
import useFetch from "../hooks/useFetch.js";
import { CLASS_COLORS, fmt } from "../lib/constants.js";
 
const PAGE = 24;
 
export default function Dataset() {
  const summary = useFetch("/api/dataset/summary");
  const seasons = useFetch("/api/dataset/seasons");
  const [page, setPage] = useState(0);
  const [years, setYears] = useState({ from: "", to: "" });
  const query = `/api/dataset/rows?skip=${page * PAGE}&limit=${PAGE}${years.from ? `&year_from=${years.from}` : ""}${
    years.to ? `&year_to=${years.to}` : ""
  }`;
  const rows = useFetch(summary.data ? query : null);
 
  if (summary.loading) return <Loading />;
  if (summary.error?.status === 404)
    return (
      <>
        <PageHeader title="Dataset explorer" />
        <EmptyState title="Dataset not found">
          Copy <code>master_dataset.csv</code> into <code>backend/data/</code> and reload this page.
        </EmptyState>
      </>
    );
  if (summary.error) return <ErrorBox error={summary.error} onRetry={summary.reload} />;
 
  const s = summary.data;
  const classData = Object.entries(s.season_classes).map(([name, count]) => ({ name, count }));
  const totalPages = rows.data ? Math.max(1, Math.ceil(rows.data.total / PAGE)) : 1;
  const columns = s.columns;
 
  return (
    <>
      <PageHeader
        title="Dataset explorer"
        subtitle={`${s.rows} monthly records, ${s.first_month} to ${s.last_month}; ${s.season_count} labelled DJF seasons.`}
      />
 
      <div className="grid-2">
        <section className="card">
          <h2>Seasonal class distribution</h2>
          <div role="img" aria-label="Bar chart of seasons per class" style={{ height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={classData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Seasons">
                  {classData.map((d) => (
                    <Cell key={d.name} fill={CLASS_COLORS[d.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card">
          <h2>Variable statistics</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Variable</th>
                  <th scope="col" className="num">Min</th>
                  <th scope="col" className="num">Max</th>
                  <th scope="col" className="num">Mean</th>
                  <th scope="col" className="num">Std</th>
                  <th scope="col" className="num">Missing</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(s.stats).map(([key, v]) => (
                  <tr key={key}>
                    <th scope="row">{v.label}</th>
                    <td className="num">{fmt(v.min, 3)}</td>
                    <td className="num">{fmt(v.max, 3)}</td>
                    <td className="num">{fmt(v.mean, 3)}</td>
                    <td className="num">{fmt(v.std, 3)}</td>
                    <td className="num">{v.missing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
 
      <section className="card">
        <h2>Labelled DJF seasons</h2>
        {seasons.loading && <Loading />}
        {seasons.error && <ErrorBox error={seasons.error} onRetry={seasons.reload} />}
        {seasons.data && (
          <div className="table-wrap scroll-y">
            <table>
              <thead>
                <tr>
                  <th scope="col">Season</th>
                  <th scope="col" className="num">Niño3.4 (DJF mean)</th>
                  <th scope="col">Class</th>
                </tr>
              </thead>
              <tbody>
                {seasons.data.map((r) => (
                  <tr key={r.season}>
                    <th scope="row">{r.season}</th>
                    <td className="num">{fmt(r.nino34_djf, 2)}</td>
                    <td>{r.label_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
 
      <section className="card">
        <div className="card-head">
          <h2>Monthly records</h2>
          <div className="inline-fields">
            <label>
              From year
              <input type="number" value={years.from} onChange={(e) => { setPage(0); setYears((y) => ({ ...y, from: e.target.value })); }} />
            </label>
            <label>
              To year
              <input type="number" value={years.to} onChange={(e) => { setPage(0); setYears((y) => ({ ...y, to: e.target.value })); }} />
            </label>
          </div>
        </div>
        {rows.loading && <Loading />}
        {rows.error && <ErrorBox error={rows.error} onRetry={rows.reload} />}
        {rows.data && rows.data.rows.length === 0 && <EmptyState title="No rows match the filter" />}
        {rows.data && rows.data.rows.length > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {columns.map((c) => (
                      <th key={c} scope="col" className={c === "year" || c === "month" ? "" : "num"}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.data.rows.map((r) => (
                    <tr key={`${r.year}-${r.month}`}>
                      {columns.map((c) => (
                        <td key={c} className={c === "year" || c === "month" ? "" : "num"}>
                          {typeof r[c] === "number" && c !== "year" && c !== "month" ? fmt(r[c], 3) : r[c]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <button type="button" className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span>
                Page {page + 1} of {totalPages} ({rows.data.total} rows)
              </span>
              <button type="button" className="btn btn-secondary btn-sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}

