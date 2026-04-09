const normalize = (baseUrl: string): string => baseUrl.replace(/\/$/, "");

const env = import.meta.env as Record<string, string | undefined>;

export const API_BASE_URL = normalize(
	env.VITE_API_BASE_URL || env.REACT_APP_API_BASE_URL || "http://localhost:3003/api"
);
export const D365_BASE_URL = normalize(
	env.VITE_D365_BASE_URL || env.REACT_APP_D365_BASE_URL || "http://localhost:8061"
);

export const apiUrl = (path: string): string => `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
export const d365Url = (path: string): string => `${D365_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
