// contentScript.js — Mail TraceX (final)
// Injects gmail.js into page context and bridges messages to background.

console.log("[MailTraceX][contentScript] Frame URL:", window.location.href);

// Inject gmail.js into page context
(function injectGmailHelper() {
  try {
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL("gmail.js");
    s.type = "text/javascript";
    s.onload = function () { this.remove(); };
    (document.head || document.documentElement).appendChild(s);
    console.log("[MailTraceX][contentScript] injected gmail.js");
  } catch (e) {
    console.error("[MailTraceX][contentScript] failed to inject gmail.js", e);
  }
})();

const PAGE_SOURCE = "mailtracex-gmail";
const EXT_SOURCE = "mailtracex-extension";




// Listen for compose:send from gmail.js
window.addEventListener("message", (event) => {
  if (!event.data || event.source !== window) return;
  const msg = event.data;
  if (msg.source !== PAGE_SOURCE) return;

  if (msg.type === "compose:send") {
    const payload = msg.payload || {};
    console.log("[MailTraceX][contentScript] forwarding compose:send to background", payload);

    // Wake service worker first
   // chrome.runtime.sendMessage({ type: "ping" }, () => {
    // Give Chrome a moment to fully wake the worker
   // setTimeout(() => {
      chrome.runtime.sendMessage(
        {
          type: "email:create",
          payload
        },
        (resp) => {
          window.postMessage(
            {
              source: EXT_SOURCE,
              type: "email:create:response",
              resp
            },
            "*"
          );
        }
      );
    //}, 50); // 50ms is enough
  //});

  }
});
