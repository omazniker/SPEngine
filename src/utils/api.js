// SPEngine API Client
// Abstraktionsschicht ueber fetch() fuer alle Server-Calls
// Faellt auf localStorage zurueck wenn API nicht erreichbar (Offline-Modus)

const API_BASE = '/api';
let _offline = false;

async function request(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    _offline = false;
    return res.json();
  } catch (e) {
    if (e.message === 'Failed to fetch' || e.name === 'TypeError') {
      _offline = true;
      console.warn('[API] Offline-Modus:', e.message);
      return null;
    }
    throw e;
  }
}

export const api = {
  isOffline: () => _offline,

  // Health
  health: () => request('/health'),

  // Scenarios
  scenarios: {
    list: () => request('/scenarios'),
    get: (id) => request(`/scenarios/${id}`),
    create: (data) => request('/scenarios', { method: 'POST', body: data }),
    update: (id, data) => request(`/scenarios/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/scenarios/${id}`, { method: 'DELETE' }),
  },

  // Presets
  presets: {
    list: () => request('/presets'),
    create: (data) => request('/presets', { method: 'POST', body: data }),
    update: (id, data) => request(`/presets/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/presets/${id}`, { method: 'DELETE' }),
  },

  // Universe Profiles
  universe: {
    list: () => request('/universe'),
    get: (id) => request(`/universe/${id}`),
    create: (data) => request('/universe', { method: 'POST', body: data }),
    delete: (id) => request(`/universe/${id}`, { method: 'DELETE' }),
  },

  // Settings
  settings: {
    getAll: () => request('/settings'),
    get: (key) => request(`/settings/${key}`),
    set: (key, value) => request(`/settings/${key}`, { method: 'PUT', body: { value } }),
  },
};

export default api;
