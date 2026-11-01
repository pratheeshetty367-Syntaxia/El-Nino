import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import ContributionChart from "../components/ContributionChart.jsx";
import ProbabilityBars from "../components/ProbabilityBars.jsx";
import { EmptyState, ErrorBox, Loading, PageHeader } from "../components/States.jsx";
import useFetch from "../hooks/useFetch.js";
import { PREDICTORS, formatDate } from "../lib/constants.js";
 
const PAGE = 10;
 
export default function History() {
  const [page, setPage] = useState(0);
  const { data, error, loading, reload } = useFetch(`/api/history?skip=${page * PAGE}&limit=${PAGE}`);
  const [openId, setOpenId] = useState(null);
  const [actionError, setActionError] = useState(null);
 
  const remove = async (id) => {
    if (!window.confirm("Delete this prediction?")) return;
    setActionError(null);
    try {
      await api.del(`/api/history/${id}`);
      if (data.items.length === 1 && page > 0) setPage((p) => p - 1);
      else reload();
    } catch (err) {
      setActionError(err);
    }
  };
 
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
 
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE));
 
  return (
    <>
      <PageHeader title="Prediction history" subtitle="Your saved predictions, newest first." />
      <ErrorBox error={actionError} />
      {data.items.length === 0 ? (
        <EmptyState title="No predictions yet">
          <Link to="/predict">Run a prediction</Link> and it will appear here.
        </EmptyState>
      ) : (
        <section className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Lead</th>
                  <th scope="col">Result</th>
                  <th scope="col" className="num">P(Extreme)</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <Fragment key={p.id}>
                    <tr>
                      <td>{formatDate(p.created_at)}</td>
                      <td>{p.lead_time} M</td>
                      <td>{p.predicted_class}</td>
                      <td className="num">{((p.probabilities["Extreme El Niño"] ?? 0) * 100).toFixed(1)}%</td>
                      <td className="actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          aria-expanded={openId === p.id}
                          onClick={() => setOpenId(openId === p.id ? null : p.id)}
                        >
                          {openId === p.id ? "Hide" : "Details"}
                        </button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(p.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                    {openId === p.id && (
                      <tr className="detail-row">
                        <td colSpan={5}>
                          <div className="grid-2">
                            <div>
                              <h3>Inputs</h3>
                              <ul className="plain">
                                {PREDICTORS.map((q) => (
                                  <li key={q.key}>
                                    {q.full}: <strong>{p.inputs[q.key]}</strong>
                                  </li>
                                ))}
                              </ul>
                              <h3>Probabilities</h3>
                              <ProbabilityBars probabilities={p.probabilities} predicted={p.predicted_class} />
                            </div>
                            <div>
                              <h3>SHAP (Extreme El Niño)</h3>
                              <ContributionChart contributions={p.contributions} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button type="button" className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <button type="button" className="btn btn-secondary btn-sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </section>
      )}
    </>
  );
}
