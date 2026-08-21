import { useEffect, useState } from 'react'
import { fetchDashboardData, getShapPlotUrl } from '../api'

function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDashboardData()
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  if (error) return <div className="error">Error loading dashboard: {error}</div>
  if (!data) return <div>Loading dashboard...</div>

  return (
    <div className="dashboard">
      <h1>Extreme El Nino Prediction Results</h1>
      <p className="subtitle">
        XGBoost + SHAP analysis across 3, 6, 9, and 12-month forecast lead times
      </p>

      <section>
        <h2>SHAP Predictor Importance Ranking</h2>
        <table>
          <thead>
            <tr>
              <th>Predictor</th>
              <th>3 Month</th>
              <th>6 Month</th>
              <th>9 Month</th>
              <th>12 Month</th>
            </tr>
          </thead>
          <tbody>
            {data.shap_importance_table.map((row) => (
              <tr key={row.Predictor}>
                <td>{row.Predictor}</td>
                <td>{row.SHAP_3m.toFixed(4)} (rank {row.Rank_3m})</td>
                <td>{row.SHAP_6m.toFixed(4)} (rank {row.Rank_6m})</td>
                <td>{row.SHAP_9m.toFixed(4)} (rank {row.Rank_9m})</td>
                <td>{row.SHAP_12m.toFixed(4)} (rank {row.Rank_12m})</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>SHAP Summary Plots</h2>
        <div className="plot-grid">
          {[3, 6, 9, 12].map((lead) => (
            <div key={lead} className="plot-card">
              <h3>{lead}-Month Lead Time</h3>
              <img src={getShapPlotUrl(lead)} alt={`SHAP summary for ${lead} month lead`} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Classifier Comparison</h2>
        <table>
          <thead>
            <tr>
              <th>Lead Time</th>
              <th>Model</th>
              <th>Accuracy</th>
              <th>Extreme Recall</th>
              <th>Extreme Precision</th>
            </tr>
          </thead>
          <tbody>
            {data.model_comparison.map((row, i) => (
              <tr key={i}>
                <td>{row['Lead Time']}</td>
                <td>{row.Model}</td>
                <td>{row.Accuracy}</td>
                <td>{row['Extreme Recall']}</td>
                <td>{row['Extreme Precision']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Historical Event Case Study</h2>
        <table>
          <thead>
            <tr>
              <th>Lead Time</th>
              <th>Event</th>
              <th>Predictor</th>
              <th>SHAP Value</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {data.case_study.map((row, i) => (
              <tr key={i}>
                <td>{row.lead_months}</td>
                <td>{row.event}</td>
                <td>{row.predictor}</td>
                <td>{row.shap_value}</td>
                <td>{row.percentage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

export default Dashboard