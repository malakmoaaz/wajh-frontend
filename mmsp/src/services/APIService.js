const API = import.meta.env.VITE_API_URL;

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return data;
}

export const APIService = {
  // Auth
  me: () => request('/api/auth/me'),
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password, role) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, role }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),

  // Predictions — NO direct ML calls from frontend
  predict: (landmarks, imageQuality, poseData) =>
    request('/api/predict', {
      method: 'POST',
      body: JSON.stringify({ landmarks, imageQuality, poseData }),
    }),
  predictionHistory: () => request('/api/predict/history'),
};