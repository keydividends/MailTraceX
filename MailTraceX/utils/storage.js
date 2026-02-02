// utils/storage.js - wrapper around chrome.storage.sync
async function setItem(key, value) {
  return new Promise((resolve) => {
    const payload = {};
    payload[key] = value;
    chrome.storage.sync.set(payload, () => resolve());
  });
}

async function getItem(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get([key], (res) => resolve(res[key]));
  });
}

async function removeItem(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.remove([key], () => resolve());
  });
}

// Higher-level token helpers
async function saveToken(token) {
  return setItem('jwt', token);
}

async function getToken() {
  return getItem('jwt');
}

async function clearToken() {
  return removeItem('jwt');
}

async function saveUser(user) {
  return setItem('user', user);
}

async function getUser() {
  return getItem('user');
}

async function clearAll() {
  return new Promise((resolve) => {
    chrome.storage.sync.clear(() => resolve());
  });
}

// Expose globally
self.setItem = setItem;
self.getItem = getItem;
self.removeItem = removeItem;
self.saveToken = saveToken;
self.getToken = getToken;
self.clearToken = clearToken;
self.saveUser = saveUser;
self.getUser = getUser;
self.clearAll = clearAll;