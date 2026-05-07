const API_BASE = process.env.REACT_APP_NODE_API || "http://localhost:3001/api";

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("sp_token");
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}
