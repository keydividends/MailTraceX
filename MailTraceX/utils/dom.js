// utils/dom.js - small DOM helpers used by page scripts / popup (skeleton)
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function create(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  children.forEach((c) => {
    if (typeof c === 'string') el.appendChild(document.createTextNode(c));
    else el.appendChild(c);
  });
  return el;
}

// Debounce helper used by gmail.js to avoid expensive repeated work on mutation bursts
export function debounce(fn, wait = 150) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

// Small UID generator for compose ids
export function uid(prefix = 'c') {
  return prefix + '_' + Math.random().toString(36).slice(2, 9);
}

export default { qs, qsa, create, debounce, uid };
// DOM helpers for content script
export function findLinks() {
  return Array.from(document.querySelectorAll('a'));
}
