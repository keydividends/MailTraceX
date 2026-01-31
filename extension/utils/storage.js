// utils/storage.js - wrapper around chrome.storage.sync
export async function setItem(key, value) {
  return new Promise((resolve) => {
    const payload = {};
    payload[key] = value;
    chrome.storage.sync.set(payload, () => resolve());
  });
}

export async function getItem(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get([key], (res) => resolve(res[key]));
  });
}

export async function removeItem(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.remove([key], () => resolve());
  });
}

// Higher-level token helpers
export async function saveToken(token) {
  return setItem('jwt', token);
}

export async function getToken() {
  return getItem('jwt');
}

export async function clearToken() {
  return removeItem('jwt');
}

export async function saveUser(user) {
  return setItem('user', user);
}

export async function getUser() {
  return getItem('user');
}

export async function clearAll() {
  return new Promise((resolve) => {
    chrome.storage.sync.clear(() => resolve());
  });
}

export default { setItem, getItem, removeItem, saveToken, getToken, clearToken, saveUser, getUser, clearAll };
