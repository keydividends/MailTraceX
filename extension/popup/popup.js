// popup.js - handles popup UI interactions with auth flow
import { saveToken, getToken } from '../utils/storage.js';
import { login as apiLogin } from '../utils/api.js';

function el(id) { return document.getElementById(id); }

function showLoggedIn(email) {
  el('loginContainer').style.display = 'none';
  el('loggedInContainer').style.display = 'block';
  el('userEmail').textContent = email || '';
}

function showLoggedOut() {
  el('loginContainer').style.display = 'block';
  el('loggedInContainer').style.display = 'none';
}

function setLoading(on) {
  el('loading').style.display = on ? 'block' : 'none';
}

function showError(msg) {
  el('error').textContent = msg || '';
  el('error').style.display = msg ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', async () => {
  const opensEl = el('opens');
  const clicksEl = el('clicks');
  const openDashboardBtn = el('openDashboard');
  const loginBtn = el('loginBtn');
  const logoutBtn = el('logoutBtn');

  // wire login form
  loginBtn.addEventListener('click', async () => {
    showError('');
    setLoading(true);
    const email = el('email').value.trim();
    const password = el('password').value;
    try {
      const resp = await apiLogin(email, password);
      if (resp && resp.ok && resp.token) {
        await saveToken(resp.token);
        // save user as well
        const { saveUser } = await import('../utils/storage.js');
        await saveUser(resp.user || { email });
        // Notify background to update its in-memory cache
        chrome.runtime.sendMessage({ type: 'auth:login', token: resp.token, user: resp.user || { email } }, () => {});
        showLoggedIn((resp.user && resp.user.email) || email);
        // request stats from background
        chrome.runtime.sendMessage({ type: 'stats:get' }, (sresp) => {
          if (sresp && sresp.ok && sresp.stats) {
            opensEl.textContent = String(sresp.stats.totalOpens || 0);
            clicksEl.textContent = String(sresp.stats.totalClicks || 0);
          }
        });
      } else {
        showError(resp && resp.message ? resp.message : 'Login failed');
      }
    } catch (err) {
      showError(err && err.message ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  });

  logoutBtn.addEventListener('click', async () => {
    setLoading(true);
    // clear token and user from storage
    const { clearAll } = await import('../utils/storage.js');
    await clearAll();
    chrome.runtime.sendMessage({ type: 'auth:logout' }, () => {});
    showLoggedOut();
    setLoading(false);
  });

  openDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://mailtracex.local/dashboard' });
  });

  // Initialize UI based on token
  setLoading(true);
  try {
    const token = await getToken();
    if (token) {
      // Ask background for cached user info and stats
      chrome.runtime.sendMessage({ type: 'auth:getInfo' }, (resp) => {
        const email = resp && resp.user && resp.user.email ? resp.user.email : '';
        showLoggedIn(email);
        // request stats
        chrome.runtime.sendMessage({ type: 'stats:get' }, (sresp) => {
          if (sresp && sresp.ok && sresp.stats) {
            opensEl.textContent = String(sresp.stats.totalOpens || 0);
            clicksEl.textContent = String(sresp.stats.totalClicks || 0);
          }
          setLoading(false);
        });
      });
    } else {
      showLoggedOut();
      setLoading(false);
    }
  } catch (err) {
    showError(String(err));
    setLoading(false);
  }
});
// popup.js - handles popup UI interactions with auth flow
import { saveToken, getToken, clearToken, saveUser } from '../utils/storage.js';
import { login as apiLogin } from '../utils/api.js';

function el(id) { return document.getElementById(id); }

function showLoggedIn(email) {
  el('loginContainer').style.display = 'none';
  el('loggedInContainer').style.display = 'block';
  el('userEmail').textContent = email || '';
}

function showLoggedOut() {
  el('loginContainer').style.display = 'block';
  el('loggedInContainer').style.display = 'none';
}

function setLoading(on) {
  el('loading').style.display = on ? 'block' : 'none';
}

function showError(msg) {
  el('error').textContent = msg || '';
  el('error').style.display = msg ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', async () => {
  const trackingToggle = el('trackingToggle');
  const opensEl = el('opens');
  const clicksEl = el('clicks');
  const openDashboardBtn = el('openDashboard');
  const loginBtn = el('loginBtn');
  const logoutBtn = el('logoutBtn');

  // wire login form
  loginBtn.addEventListener('click', async () => {
    showError('');
    setLoading(true);
    const email = el('email').value.trim();
    const password = el('password').value;
    try {
      const resp = await apiLogin(email, password);
      if (resp && resp.ok && resp.token) {
        await saveToken(resp.token);
        await saveUser(resp.user || { email });
        // Notify background to update its in-memory cache
        chrome.runtime.sendMessage({ type: 'auth:login', token: resp.token, user: resp.user || { email } }, () => {});
        showLoggedIn((resp.user && resp.user.email) || email);
        // request stats from background
        chrome.runtime.sendMessage({ type: 'stats:get' }, (sresp) => {
          if (sresp && sresp.ok && sresp.stats) {
            opensEl.textContent = String(sresp.stats.totalOpens || 0);
            clicksEl.textContent = String(sresp.stats.totalClicks || 0);
          }
        });
      } else {
        showError(resp && resp.message ? resp.message : 'Login failed');
      }
    } catch (err) {
      showError(err && err.message ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  });

  logoutBtn.addEventListener('click', async () => {
    setLoading(true);
    await clearToken();
    // clear user as well
    chrome.runtime.sendMessage({ type: 'auth:logout' }, () => {});
    showLoggedOut();
    setLoading(false);
  });

  openDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://mailtracex.local/dashboard' });
  });

  // Initialize UI based on token
  setLoading(true);
  try {
    const token = await getToken();
    if (token) {
      // Ask background for cached user info and stats
      chrome.runtime.sendMessage({ type: 'auth:getInfo' }, (resp) => {
        const email = resp && resp.email ? resp.email : '';
        showLoggedIn(email);
        // request stats
        chrome.runtime.sendMessage({ type: 'stats:get' }, (sresp) => {
          if (sresp && sresp.ok && sresp.stats) {
            opensEl.textContent = String(sresp.stats.totalOpens || 0);
            clicksEl.textContent = String(sresp.stats.totalClicks || 0);
          }
          setLoading(false);
        });
      });
    } else {
      showLoggedOut();
      setLoading(false);
    }
  } catch (err) {
    showError(String(err));
    setLoading(false);
  }
});
document.getElementById('login')?.addEventListener('click', () => {
  alert('Open login — not implemented');
});
