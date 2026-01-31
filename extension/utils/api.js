// utils/api.js - API wrapper for background/popup


const API_BASE = 'http://localhost:4000';

function makeError(code, message, details) {
  return { ok: false, code, message, details };
}

async function login(email, password) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (res.status === 401) return makeError('invalid_credentials', 'Invalid email or password');
    if (!res.ok) return makeError('network_error', `HTTP ${res.status}`);
    const data = await res.json();
    // Expect { token, user }
    return { ok: true, token: data.token, user: data.user };
  } catch (err) {
    return makeError('network_error', String(err));
  }
}

async function authenticatedFetch(path, opts = {}) {
  try {
    // read token from storage
    const token = await storageGetToken();
    if (!token) return makeError('no_token', 'No auth token available');
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const headers = Object.assign({}, opts.headers || {}, { Authorization: `Bearer ${token}` });
    const res = await fetch(url, Object.assign({}, opts, { headers }));
    if (res.status === 401) return { error: 'unauthorized' };
    if (!res.ok) return makeError('network_error', `HTTP ${res.status}`);
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return makeError('network_error', String(err));
  }
}

async function getStats() {
  const r = await authenticatedFetch('/api/stats/summary');
  if (!r.ok) return r;
  return { ok: true, ...r.data };
}

async function createEmail({ subject, recipients, bodyHtml }) {
  const r = await authenticatedFetch('/api/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, recipients, bodyHtml })
  });
  if (!r.ok) return r;
  return { ok: true, emailId: r.data.emailId };
}

async function rewriteLink(emailId, originalUrl) {
  const r = await authenticatedFetch('/api/redirect/rewrite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailId, originalUrl })
  });
  if (!r.ok) return r;
  return { ok: true, rewrittenUrl: r.data.rewrittenUrl };
}

function getTrackingPixelUrl(emailId) {
  return `${API_BASE}/api/pixel?t=${encodeURIComponent(emailId)}`;
}


// Expose globally
window.login = login;
window.authenticatedFetch = authenticatedFetch;
window.getStats = getStats;
window.rewriteLink = rewriteLink;
window.getTrackingPixelUrl = getTrackingPixelUrl;
