// contentScript.js - injected into Gmail pages
// Responsibilities:
// - inject `gmail.js` into the page context (so it can access page JS)
// - listen for messages posted from the injected script and forward to background
// - receive rewritten links from background and notify page script

// Inject the page-level helper script (gmail.js) so it runs in the page context
(function injectGmailHelper() {
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('gmail.js');
  s.type = 'text/javascript';
  s.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(s);
})();

// Listen for messages from the page (gmail.js)
window.addEventListener('message', async (event) => {
  if (!event.data || event.source !== window) return;
  const msg = event.data;
  if (msg.source !== 'mailtracex-gmail') return;

  switch (msg.type) {
    case 'compose:ready':
      // Page reports a compose window ready with metadata.
      // We forward the event to background for telemetry/state but do NOT create an email record yet.
      chrome.runtime.sendMessage({ type: 'compose:ready', payload: msg.payload });
      break;
    case 'compose:send':
      // Send-time: create the email record via background and reply to page with the result.
      chrome.runtime.sendMessage({ type: 'auth:getToken' }, (tokenResp) => {
        const token = tokenResp && tokenResp.token;
        if (!token) {
          console.warn('MailTraceX: no auth token; cannot create email');
          window.postMessage({ source: 'mailtracex-extension', type: 'email:create:response', resp: { ok: false } }, '*');
          return;
        }
        chrome.runtime.sendMessage({ type: 'email:create', payload: msg.payload }, (resp) => {
          window.postMessage({ source: 'mailtracex-extension', type: 'email:create:response', resp }, '*');
        });
      });
      break;
    case 'compose:rewriteLink':
      // At any time the page may request a link rewrite. Ensure auth, then forward to background.
      chrome.runtime.sendMessage({ type: 'auth:getToken' }, (tokenResp) => {
        const token = tokenResp && tokenResp.token;
        if (!token) {
          console.warn('MailTraceX: no auth token; skipping link rewrite for', msg.url);
          window.postMessage({ source: 'mailtracex-extension', type: 'link:rewrite:response', original: msg.url, rewritten: null }, '*');
          return;
        }
        chrome.runtime.sendMessage({ type: 'link:rewrite', emailId: msg.emailId, url: msg.url }, (resp) => {
          // normalize response to { rewritten }
          const rewritten = resp && (resp.rewritten || resp.rewrittenUrl) || null;
          window.postMessage({ source: 'mailtracex-extension', type: 'link:rewrite:response', original: msg.url, rewritten }, '*');
        });
      });
      break;
    default:
      // Ignore
      break;
  }
});

// Listen for commands from popup (e.g., toggle tracking) via runtime messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'setTrackingEnabled') {
    // Relay to page
    window.postMessage({ source: 'mailtracex-extension', type: 'tracking:set', enabled: message.enabled }, '*');
    sendResponse({ ok: true });
  }
  return true;
});
// Content script: inject tracking pixel and rewrite links when needed
console.log('contentScript loaded');
