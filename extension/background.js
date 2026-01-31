// background.js - service worker for Mail TraceX extension (skeleton)
// Responsibilities (placeholders):
// - store/retrieve JWT in chrome.storage
// - handle messages from content script and popup
// - provide API wrapper functions to call backend

// NOTE: This file contains placeholder implementations. Do NOT add production secrets here.

// Simple storage helpers using chrome.storage
const storage = {
  async set(key, value) {
    return new Promise((resolve) => {
      const item = {};
      item[key] = value;
      chrome.storage.sync.set(item, () => resolve());
    });
  },
  async get(key) {
    return new Promise((resolve) => {
      chrome.storage.sync.get([key], (result) => resolve(result[key]));
    });
  },
  async remove(key) {
    return new Promise((resolve) => {
      chrome.storage.sync.remove([key], () => resolve());
    });
  }
};

// Placeholder API base
const API_BASE = 'http://localhost:4000';

// Minimal API wrapper (placeholder)
async function apiRequest(path, opts = {}) {
  // Placeholder: in real code, attach JWT, handle errors, retries, etc.
  const url = `${API_BASE}${path}`;
  // Return a not-implemented promise so callers can stub behavior.
  return Promise.resolve({ url, opts, message: 'apiRequest not implemented in extension skeleton' });
}

async function login(email, password) {
  // TODO: implement real login flow
  return apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

async function rewriteLink(originalUrl) {
  // TODO: call backend rewrite endpoint and return rewritten URL
  return Promise.resolve(`${API_BASE}/r?u=${encodeURIComponent(originalUrl)}`);
}

async function getTrackingPixelUrl(emailId) {
  // TODO: return real pixel URL from backend
  return Promise.resolve(`${API_BASE}/pixel/${emailId}`);
}

// In-memory token cache for faster access
let tokenCache = null;
let emailCache = null;

async function setToken(token, email) {
  tokenCache = token || null;
  if (token) await storage.set('jwt', token);
  if (email) {
    // store user object under 'user'
    emailCache = email;
    await storage.set('user', email);
  }
}

async function clearToken() {
  tokenCache = null;
  emailCache = null;
  await storage.remove('jwt');
  await storage.remove('user');
}

async function loadTokenFromStorage() {
  try {
    const t = await storage.get('jwt');
    const u = await storage.get('user');
    tokenCache = t || null;
    emailCache = u || null;
  } catch (err) {
    console.warn('Failed to load token from storage', err);
  }
}

// Call at startup
loadTokenFromStorage();

// Helper to perform authenticated fetch from background
async function authFetch(path, opts = {}) {
  const token = tokenCache;
  if (!token) return { ok: false, code: 'no_token', message: 'No auth token available' };
  try {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const headers = Object.assign({}, opts.headers || {}, { Authorization: `Bearer ${token}` });
    const res = await fetch(url, Object.assign({}, opts, { headers }));
    if (res.status === 401) return { ok: false, code: 'unauthorized', message: 'Token rejected' };
    if (!res.ok) return { ok: false, code: 'http_error', message: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, code: 'network_error', message: String(err) };
  }
}

// Handle incoming messages from content scripts and popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg.type) {
        case 'auth:login':
          // msg: { token, user }
          await setToken(msg.token, msg.user || null);
          sendResponse({ ok: true });
          break;
        case 'auth:logout':
          await clearToken();
          sendResponse({ ok: true });
          break;
        case 'auth:getToken': {
          // Return token quickly
          sendResponse({ ok: true, token: tokenCache });
          break;
        }
        case 'auth:getInfo': {
          sendResponse({ ok: true, user: emailCache });
          break;
        }
        // Backwards-compatible older message name
        case 'rewriteLink': {
          const resp = await authFetch('/api/redirect/rewrite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailId: msg.emailId || null, originalUrl: msg.url })
          });
          if (resp.ok) sendResponse({ ok: true, rewritten: resp.data.rewrittenUrl || resp.data.rewritten });
          else sendResponse({ ok: false, error: resp.message, code: resp.code });
          break;
        }
        case 'email:create': {
          // Create email record in backend: expect { subject, recipients, bodyHtml }
          const resp = await authFetch('/api/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(msg.payload)
          });
          if (resp.ok) sendResponse({ ok: true, emailId: resp.data.emailId });
          else sendResponse({ ok: false, error: resp.message, code: resp.code });
          break;
        }
        case 'link:rewrite': {
          // msg: { emailId, url }
          const resp = await authFetch('/api/redirect/rewrite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailId: msg.emailId, originalUrl: msg.url })
          });
          if (resp.ok) sendResponse({ ok: true, rewrittenUrl: resp.data.rewrittenUrl });
          else sendResponse({ ok: false, error: resp.message, code: resp.code });
          break;
        }
        case 'stats:get': {
          const resp = await authFetch('/api/stats/summary');
          if (resp.ok) sendResponse({ ok: true, stats: resp.data });
          else sendResponse({ ok: false, error: resp.message, code: resp.code });
          break;
        }
        case 'api:request': {
          // Generic API request forwarded by content scripts
          const resp = await authFetch(msg.path, msg.opts || {});
          sendResponse(resp);
          break;
        }
        case 'getStats': {
          const resp = await authFetch('/stats');
          sendResponse(resp);
          break;
        }
        default:
          sendResponse({ ok: false, error: 'unknown message type' });
      }
    } catch (err) {
      console.error('background message handler error', err);
      sendResponse({ ok: false, error: String(err) });
    }
  })();
  // Keep message channel open for async response
  return true;
});

// Optional: Respond to install events
chrome.runtime.onInstalled.addListener(() => {
  // Initialize default settings
  storage.get('trackingEnabled').then((v) => {
    if (v === undefined) storage.set('trackingEnabled', true);
  });
});
// Background service worker for extension
self.addEventListener('install', () => console.log('Extension installed'));
