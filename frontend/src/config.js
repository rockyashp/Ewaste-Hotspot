// Centralized API configuration supporting local development and deployed cloud environments
const rawUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

// Strip any trailing slash e.g. "https://api.onrender.com/" -> "https://api.onrender.com"
export const API_BASE = rawUrl
  ? rawUrl.replace(/\/+$/, '')
  : (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

export const IS_PRODUCTION = Boolean(import.meta.env.PROD);
export const HAS_CUSTOM_API = Boolean(rawUrl);
