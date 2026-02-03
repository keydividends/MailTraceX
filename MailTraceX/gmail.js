// gmail.js — Mail TraceX (patched, production-grade)

console.log("[MailTraceX][gmail] loaded");

(function () {
  "use strict";

  const SOURCE = "mailtracex-gmail";
  const composes = new Map();

  function uid() {
    return "c_" + Math.random().toString(36).slice(2, 9);
  }

  // ---------- Visibility helper ----------
  function isVisible(el) {
    if (!el) return false;
    if (el.offsetParent === null) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  // ---------- Robust editor detection ----------
  function findEditorElement(root) {
    if (!root) return null;

    const selectors = [
      '[aria-label="Message Body"]',
      'div[contenteditable="true"]',
      '[g_editable="true"]',
      'div[role="textbox"][contenteditable="true"]'
    ];

    for (const sel of selectors) {
      const el = root.querySelector(sel);
      if (el && isVisible(el)) return el;
    }

    return null;
  }

  function findEditorDoc() {
    if (findEditorElement(document)) return document;

    for (let i = 0; i < window.frames.length; i++) {
      try {
        const doc = window.frames[i].document;
        if (findEditorElement(doc)) return doc;
      } catch {}
    }

    return document;
  }

  function getBodyHtml() {
    const doc = findEditorDoc();
    const el = findEditorElement(doc);
    if (!el) return "";

    const html = el.innerHTML || "";
    const stripped = html.replace(/(&nbsp;|\s|<br\s*\/?>)/gi, "").trim();
    return stripped ? html : "";
  }

  // ---------- Subject ----------
  function getSubject(composeEl) {
    const el =
      composeEl.querySelector('input[name="subjectbox"]') ||
      composeEl.querySelector('input[aria-label*="Subject"]') ||
      document.querySelector('input[name="subjectbox"]');

    return (el && el.value && el.value.trim()) || "";
  }

  // ---------- Recipients ----------
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

  // ---------- Send handler ----------
  function createSendClickHandler(composeId) {
    return function () {
      const info = composes.get(composeId);

      if (!info) {
        console.log("[MailTraceX][gmail] send ignored (no compose info)", composeId);
        return;
      }

      const { editor, node } = info;

      if (!editor) {
        console.log("[MailTraceX][gmail] send ignored (no editor captured)", composeId);
        return;
      }

      // Cache body before Gmail destroys DOM
      info.cachedBodyHtml = editor.innerHTML;

      console.log("[MailTraceX][gmail] send clicked for", composeId);

      const subject = getSubject(node);
      const recipients = getRecipients(node);
      const bodyHtml = info.cachedBodyHtml;

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

  function registerCompose(node) {
    if (!node) return;

    // Ignore hidden Gmail clones
    if (
      node.classList.contains("Hd") ||
      node.style.display === "none" ||
      node.style.visibility === "hidden" ||
      node.offsetParent === null
    ) {
      console.log("[MailTraceX][gmail] ignoring hidden compose", node);
      return;
    }

    // Skip if already registered
    for (const info of composes.values()) {
      if (info.node === node) return;
    }

    // Assign ID once
    const composeId = uid();
    node.setAttribute("data-mtx-compose-id", composeId);

    // Capture the editor NOW — Gmail will delete it later
    const editor = node.querySelector('.editable[g_editable="true"]');

    composes.set(composeId, {
      node,
      editor,          // captured early
      cachedBodyHtml: ""
    });

    console.log("[MailTraceX][gmail] compose registered", composeId, node);

    attachSendHandler(composeId, node);
  }



  function unregisterCompose(id) {
    const info = composes.get(id);
    if (!info) return;

    composes.delete(id);
    console.log("[MailTraceX][gmail] compose unregistered", id);
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
