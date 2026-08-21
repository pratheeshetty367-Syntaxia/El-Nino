// api.js
// Centralizes all communication with the FastAPI backend.

const API_BASE_URL = "http://127.0.0.1:8000";

export async function fetchDashboardData() {
  const response = await fetch(`${API_BASE_URL}/dashboard-data`);
  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard data: ${response.status}`);
  }
  return response.json();
}

export async function fetchPrediction(inputValues) {
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputValues),
  });
  if (!response.ok) {
    throw new Error(`Prediction failed: ${response.status}`);
  }
  return response.json();
}

export function getShapPlotUrl(leadMonths) {
  return `${API_BASE_URL}/shap-plot/${leadMonths}`;
}