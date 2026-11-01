const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const TOKEN_KEY = "elnino_token";
 
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) =>
  token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);
 
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
 
async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
 
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check that the backend is running.", 0);
  }
 
  if (response.status === 401 && auth) {
    setToken(null);
    window.dispatchEvent(new Event("auth:logout"));
  }
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (typeof data.detail === "string") detail = data.detail;
      else if (Array.isArray(data.detail)) detail = data.detail.map((e) => e.msg).join("; ");
    } catch {
      /* response had no JSON body */
    }
    throw new ApiError(detail, response.status);
  }
  if (response.status === 204) return null;
  return response.json();
}
 
export const api = {
  get: (path) => request(path),
  post: (path, body = {}) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  del: (path) => request(path, { method: "DELETE" }),
  publicPost: (path, body) => request(path, { method: "POST", body, auth: false }),
};
