import { useEffect, useState } from "react";
import { api } from "../api.js";
import { ErrorBox, Loading, Note, PageHeader } from "../components/States.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import useFetch from "../hooks/useFetch.js";
import { formatDate } from "../lib/constants.js";
 
const JOB_LABELS = { train: "Train XGBoost models + SHAP", baselines: "Run baseline classifiers" };
 
export default function Admin() {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const stats = useFetch("/api/admin/stats");
  const users = useFetch("/api/admin/users");
  const [actionError, setActionError] = useState(null);
 
  const running = Object.values(stats.data?.jobs ?? {}).some((j) => j.status === "running");
 
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(stats.reload, 3000);
    return () => clearInterval(timer);
  }, [running, stats.reload]);
 
  const startJob = async (name) => {
    setActionError(null);
    try {
      await api.post(`/api/admin/${name}`);
      stats.reload();
    } catch (err) {
      setActionError(err);
    }
  };
 
  const updateUser = async (id, patch) => {
    setActionError(null);
    try {
      await api.patch(`/api/admin/users/${id}`, patch);
      users.reload();
    } catch (err) {
      setActionError(err);
    }
  };
 
  if (stats.loading && !stats.data) return <Loading />;
  if (stats.error) return <ErrorBox error={stats.error} onRetry={stats.reload} />;
  const s = stats.data;
 
  return (
    <>
      <PageHeader title="Admin / researcher" subtitle="Platform statistics, model training and user management." />
      <ErrorBox error={actionError} />
 
      <section className="stat-grid" aria-label="Platform statistics">
        <div className="stat"><span className="stat-value">{s.users}</span><span className="stat-label">registered users</span></div>
        <div className="stat"><span className="stat-value">{s.predictions}</span><span className="stat-label">predictions made</span></div>
        <div className="stat">
          <span className="stat-value">{s.models.models.filter((m) => m.ready).length}/4</span>
          <span className="stat-label">trained models</span>
        </div>
        <div className="stat">
          <span className="stat-value">{s.dataset_present ? "Yes" : "No"}</span>
          <span className="stat-label">master dataset found</span>
        </div>
      </section>
 
      <section className="card">
        <h2>Model training</h2>
        <p className="muted">
          Training reads <code>backend/data/master_dataset</code>, runs LOOCV for each lead time, saves the final models and
          recomputes SHAP importance and event-level shares. It can take a few minutes.
        </p>
        <div className="job-list">
          {Object.entries(JOB_LABELS).map(([name, label]) => {
            const job = s.jobs[name];
            return (
              <div className="job" key={name}>
                <div>
                  <strong>{label}</strong>
                  <p className="muted" role="status">
                    Status: {job.status}
                    {job.finished_at && ` — ${formatDate(job.finished_at)}`}
                    {job.error && ` — ${job.error}`}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!isAdmin || job.status === "running" || !s.dataset_present}
                  onClick={() => startJob(name)}
                >
                  {job.status === "running" ? "Running…" : "Start"}
                </button>
              </div>
            );
          })}
        </div>
        {!isAdmin && <Note>Only admins can start training jobs.</Note>}
        {!s.dataset_present && <Note>Add master_dataset.csv to backend/data to enable training.</Note>}
      </section>
 
      <section className="card">
        <h2>Predictions by lead time</h2>
        {Object.keys(s.predictions_by_lead).length === 0 ? (
          <p className="muted">No predictions recorded yet.</p>
        ) : (
          <ul className="plain">
            {Object.entries(s.predictions_by_lead).map(([lead, n]) => (
              <li key={lead}>{lead} months: <strong>{n}</strong></li>
            ))}
          </ul>
        )}
      </section>
 
      <section className="card">
        <h2>Users</h2>
        {users.loading && <Loading />}
        {users.error && <ErrorBox error={users.error} onRetry={users.reload} />}
        {users.data && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Active</th>
                  <th scope="col">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.data.map((u) => (
                  <tr key={u.id}>
                    <th scope="row">{u.full_name}</th>
                    <td>{u.email}</td>
                    <td>
                      <label className="sr-only" htmlFor={`role-${u.id}`}>Role for {u.full_name}</label>
                      <select
                        id={`role-${u.id}`}
                        value={u.role}
                        disabled={!isAdmin || u.id === user.id}
                        onChange={(e) => updateUser(u.id, { role: e.target.value })}
                      >
                        <option value="user">user</option>
                        <option value="researcher">researcher</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>
                      <label>
                        <input
                          type="checkbox"
                          checked={u.is_active}
                          disabled={!isAdmin || u.id === user.id}
                          onChange={(e) => updateUser(u.id, { is_active: e.target.checked })}
                        />
                        <span className="sr-only">Active</span>
                      </label>
                    </td>
                    <td>{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

