import { useState } from 'react'
import { fetchPrediction } from '../api'

const PREDICTOR_FIELDS = [
  { key: 'sst_anom', label: 'SST Anomaly (°C)' },
  { key: 'ohc_anom', label: 'OHC Anomaly' },
  { key: 'iod_dmi', label: 'IOD (DMI)' },
  { key: 'wind_anom', label: 'Wind Anomaly' },
  { key: 'atl_sst_anom', label: 'Atlantic SST Anomaly' },
]

function Predict() {
  const [leadMonths, setLeadMonths] = useState(3)
  const [values, setValues] = useState({
    sst_anom: 0,
    ohc_anom: 0,
    iod_dmi: 0,
    wind_anom: 0,
    atl_sst_anom: 0,
  })
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function handleValueChange(key, value) {
    setValues((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetchPrediction({
        lead_months: leadMonths,
        ...values,
      })
      setResult(response)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="predict-page">
      <h1>Live Prediction</h1>
      <p className="subtitle">
        Enter oceanic predictor values to get a real-time, explainable Extreme El Nino forecast.
      </p>

      <form onSubmit={handleSubmit}>
        <label>
          Forecast Lead Time:
          <select value={leadMonths} onChange={(e) => setLeadMonths(parseInt(e.target.value))}>
            <option value={3}>3 Months</option>
            <option value={6}>6 Months</option>
            <option value={9}>9 Months</option>
            <option value={12}>12 Months</option>
          </select>
        </label>

        {PREDICTOR_FIELDS.map((field) => (
          <label key={field.key}>
            {field.label}:
            <input
              type="number"
              step="0.01"
              value={values[field.key]}
              onChange={(e) => handleValueChange(field.key, e.target.value)}
            />
          </label>
        ))}

        <button type="submit" disabled={loading}>
          {loading ? 'Predicting...' : 'Get Prediction'}
        </button>
      </form>

      {error && <div className="error">Error: {error}</div>}

      {result && (
        <div className="prediction-result">
          <h2>Prediction: {result.predicted_class}</h2>

          <h3>Class Probabilities</h3>
          <ul>
            {Object.entries(result.class_probabilities).map(([cls, prob]) => (
              <li key={cls}>
                {cls}: {(prob * 100).toFixed(1)}%
              </li>
            ))}
          </ul>

          <h3>SHAP Contributions (why this prediction was made)</h3>
          <ul>
            {Object.entries(result.shap_contributions).map(([predictor, value]) => (
              <li key={predictor}>
                {predictor}: {value >= 0 ? '+' : ''}{value.toFixed(4)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default Predict