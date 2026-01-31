// DOM helpers for content script
export function findLinks() {
  return Array.from(document.querySelectorAll('a'));
}
