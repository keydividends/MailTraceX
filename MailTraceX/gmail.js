// gmail.js — Mail TraceX (final)
// Runs in page context, can see Gmail's real DOM.

console.log("[MailTraceX][gmail] loaded");

(function () {
  "use strict";

  const SOURCE = "mailtracex-gmail";
  const composes = new Map();
  let sendInProgress = false;

  function uid() {
    return "c_" + Math.random().toString(36).slice(2, 9);
  }

  // ---------- Helpers ----------

  function isVisible(el) {
    try {
      if (!el) return false;
      if (el.offsetParent === null) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      return true;
    } catch {
      return false;
    }
  }

  // ---------- Compose detection ----------

  function findComposeElements(root = document) {
    const results = new Set();

    root.querySelectorAll('div[role="dialog"]').forEach(el => {
      if (
        el.querySelector('input[name="subjectbox"]') ||
        el.querySelector('[aria-label="Message Body"]') ||
        el.querySelector('[contenteditable]')
      ) {
        results.add(el);
      }
    });

    root.querySelectorAll('div[aria-label="New Message"]').forEach(el => results.add(el));
    root.querySelectorAll('div[aria-label^="Reply"], div[aria-label*="Reply all"]').forEach(el => results.add(el));

    return Array.from(results);
  }

  let primaryComposeId = null;

function registerCompose(node) {
  if (!node) return;

  // Ignore hidden Gmail clones
  if (!isVisible(node)) {
    console.log("[MailTraceX][gmail] ignoring hidden compose", node);
    return;
  }

  // Ignore composes created after send click
  if (sendInProgress) {
    console.log("[MailTraceX][gmail] ignoring compose created after send", node);
    return;
  }

  // Only allow ONE compose window to register
  if (primaryComposeId !== null) {
    console.log("[MailTraceX][gmail] ignoring secondary compose", node);
    return;
  }

  // Register the FIRST compose only
  const id = uid();
  primaryComposeId = id;

  composes.set(id, { node });
  node.setAttribute("data-mtx-compose-id", id);

  console.log("[MailTraceX][gmail] PRIMARY compose detected", id, node);

  attachSendHandler(id, node);
  return id;
}


  function unregisterCompose(id) {
    const info = composes.get(id);
    if (!info) return;

    composes.delete(id);

    // 🔹 If this was the primary compose, allow a new one next time
    if (id === primaryComposeId) {
      primaryComposeId = null;
      sendInProgress = false;
      console.log("[MailTraceX][gmail] primary compose unregistered, state reset");
    }
  }


  // ---------- Send button detection ----------

  function findRealSendButton(composeEl) {
    const selectors = [
      'div[role="button"][aria-label="Send"]',
      'div[aria-label="Send"]',
      'button[aria-label="Send"]',
      'div[role="button"][data-tooltip*="Send"]'
    ];

    for (const sel of selectors) {
      const btn = composeEl.querySelector(sel);
      if (btn && isVisible(btn)) return btn;
    }

    return null;
  }

  function attachSendHandler(composeId, composeEl) {
    const btn = findRealSendButton(composeEl);
    if (!btn) {
      console.log("[MailTraceX][gmail] No real send button found for", composeId);
      return;
    }

    console.log("[MailTraceX][gmail] REAL send button chosen for", composeId, btn);

    const handler = createSendClickHandler(composeId, composeEl);
    btn.addEventListener("click", handler);
  }

  // ---------- Metadata extraction ----------

  function findEditorDoc() {
    for (let i = 0; i < window.frames.length; i++) {
      try {
        const frame = window.frames[i];
        const doc = frame.document;
        if (!doc) continue;

        if (
          doc.querySelector('[aria-label="Message Body"]') ||
          doc.querySelector('div[contenteditable="true"]')
        ) {
          return doc;
        }
      } catch {}
    }
    return document;
  }

  function getSubject(composeEl) {
    const el =
      composeEl.querySelector('input[name="subjectbox"]') ||
      composeEl.querySelector('input[aria-label*="Subject"]') ||
      document.querySelector('input[name="subjectbox"]');
    return (el && el.value && el.value.trim()) || "";
  }

  function getRecipients(composeEl) {
    const recipients = new Set();

    composeEl.querySelectorAll("span[email], [email]").forEach(p => {
      const e = p.getAttribute("email");
      if (e) recipients.add(e.trim());
    });

    composeEl
      .querySelectorAll('textarea[name="to"], input[type="email"], input[name="to"], div[aria-label="To"]')
      .forEach(n => {
        const v = n.value || n.textContent || n.getAttribute("data-legacy-email");
        if (v) {
          v.split(/[,\n;]+/).map(x => x.trim()).filter(Boolean).forEach(x => recipients.add(x));
        }
      });

    return Array.from(recipients);
  }

  function getBodyHtml() {
    const editorDoc = findEditorDoc();

    const bodyEl =
      editorDoc.querySelector('[aria-label="Message Body"]') ||
      editorDoc.querySelector('div[contenteditable="true"]');

    if (!bodyEl) return "";

    let html = bodyEl.innerHTML || "";
    if (!html) return "";

    const stripped = html.replace(/(&nbsp;|\s|<br\s*\/?>)/gi, "").trim();
    if (!stripped) return "";

    return html;
  }

  // ---------- Send handler ----------

  function createSendClickHandler(composeId, composeEl) {
    return function () {
      sendInProgress = true;

      console.log("[MailTraceX][gmail] send clicked for", composeId);

      const subject = getSubject(composeEl);
      const recipients = getRecipients(composeEl);
      const bodyHtml = getBodyHtml();

      const payload = { composeId, subject, recipients, bodyHtml };
      console.log("[MailTraceX][gmail] compose:send payload", payload);

      window.postMessage(
        {
          source: SOURCE,
          type: "compose:send",
          payload
        },
        "*"
      );
    };
  }

  // ---------- Mutation observer ----------

  const observer = new MutationObserver(() => {
    const found = findComposeElements(document);
    found.forEach(el => registerCompose(el));

    for (const [id, info] of composes.entries()) {
      if (!document.contains(info.node)) unregisterCompose(id);
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  findComposeElements(document).forEach(el => registerCompose(el));
})();
