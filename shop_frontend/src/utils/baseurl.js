const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;

let baseUrl = import.meta.env.PROD ? "/api" : "http://localhost:8000/api";

if (envUrl) {
  const cleaned = envUrl.trim().replace(/\/$/, "");
  baseUrl = cleaned.endsWith("/api") ? cleaned : `${cleaned}/api`;
}

export default baseUrl;