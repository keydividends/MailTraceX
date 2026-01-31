// popup.js - consolidated ES module for popup UI interactions

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
  const ld = el('loading');
  if (ld) ld.style.display = on ? 'block' : 'none';
}

function showError(msg) {
  const err = el('error');
  if (!err) return;
  err.textContent = msg || '';
  err.style.display = msg ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', async () => {
  const opensEl = el('opens');
  const clicksEl = el('clicks');
  const openDashboardBtn = el('openDashboard');
  const loginBtn = el('loginBtn');
  const logoutBtn = el('logoutBtn');

  // wire login form
  if (loginBtn) loginBtn.addEventListener('click', async () => {
    showError('');
    setLoading(true);
    const email = el('email').value.trim();
    const password = el('password').value;
    try {
      const resp = await login(email, password);
      if (resp && resp.ok && resp.token) {
        await saveToken(resp.token);
        await saveUser(resp.user || { email });
        chrome.runtime.sendMessage({ type: 'auth:login', token: resp.token, user: resp.user || { email } }, () => {});
        showLoggedIn((resp.user && resp.user.email) || email);
        chrome.runtime.sendMessage({ type: 'stats:get' }, (sresp) => {
          if (sresp && sresp.ok && sresp.stats) {
            if (opensEl) opensEl.textContent = String(sresp.stats.totalOpens || 0);
            if (clicksEl) clicksEl.textContent = String(sresp.stats.totalClicks || 0);
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

  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    setLoading(true);
    await clearToken();
    chrome.runtime.sendMessage({ type: 'auth:logout' }, () => {});
    showLoggedOut();
    setLoading(false);
  });

  if (openDashboardBtn) openDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://mailtracex.local/dashboard' });
  });

  // Initialize UI based on token
  setLoading(true);
  try {
    const token = await getToken();
    if (token) {
      chrome.runtime.sendMessage({ type: 'auth:getInfo' }, (resp) => {
        const email = resp && (resp.user && resp.user.email) ? resp.user.email : (resp && resp.email ? resp.email : '');
        showLoggedIn(email);
        chrome.runtime.sendMessage({ type: 'stats:get' }, (sresp) => {
          if (sresp && sresp.ok && sresp.stats) {
            if (opensEl) opensEl.textContent = String(sresp.stats.totalOpens || 0);
            if (clicksEl) clicksEl.textContent = String(sresp.stats.totalClicks || 0);
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
