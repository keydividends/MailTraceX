// gmail.js - runs in page context (injected by contentScript)
// Utilities for interacting with Gmail DOM. These are placeholders and must be adapted
// to Gmail's dynamic DOM in a real implementation.

(function () {
  'use strict';
  const DEBUG = false; // set to true for verbose logs during development
  const SOURCE = 'mailtracex-gmail';

  // Map of composeId -> { node, injected, emailId }
  const composes = new Map();

  // Utility: generate a short unique id per compose window
  function uid() {
    return 'c_' + Math.random().toString(36).slice(2, 9);
  }

  function log(...args) { if (DEBUG) console.log('[MailTraceX]', ...args); }
  function warn(...args) { console.warn('[MailTraceX]', ...args); }

  // ---------- Selector strategy and rationale ----------
  // Gmail is highly dynamic; classes change often. We rely on attributes and roles:
  // - div[role="dialog"] often hosts pop-out compose windows (stable role)
  // - div[aria-label="New Message"] covers inline compose containers
  // - div[aria-label*="Reply"] covers inline reply windows
  // For body: div[aria-label="Message Body"] is common; fall back to [role="textbox"][contenteditable]
  // For subject: input[name="subjectbox"] is the canonical selector used by Gmail
  // For send button: div[role="button"][data-tooltip*="Send"] matches toolbar send buttons (tooltip contains localized "Send")

  // Debounce helper to avoid thrashing on rapid mutations
  function debounce(fn, wait = 150) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // ---------- Compose detection ----------
  function findComposeElements(root = document) {
    const results = new Set();
    // Pop-out dialog
    (root.querySelectorAll('div[role="dialog"]') || []).forEach((el) => {
      // Heuristic: dialog that contains a message body or subject input
      if (el.querySelector('input[name="subjectbox"]') || el.querySelector('[aria-label="Message Body"]') || el.querySelector('[role="textbox"][contenteditable]')) results.add(el);
    });

    // Inline compose (New Message)
    (root.querySelectorAll('div[aria-label="New Message"]') || []).forEach((el) => results.add(el));

    // Inline reply variants
    (root.querySelectorAll('div[aria-label^="Reply"], div[aria-label*="Reply all"]') || []).forEach((el) => results.add(el));

    return Array.from(results);
  }

  function registerCompose(node) {
    if (!node) return null;
    // If already tracked, skip
    for (const [id, info] of composes.entries()) {
      if (info.node === node) return id;
    }
    const id = uid();
    composes.set(id, { node, injected: false, emailId: null });
    log('compose detected', id);
    // Notify content script (via window message) that compose is ready
    const meta = getEmailMetadata(node);
    window.postMessage({ source: SOURCE, type: 'compose:ready', payload: Object.assign({ composeId: id }, meta) }, '*');
    attachSendHandler(id, node);
    return id;
  }

  function unregisterCompose(id) {
    const info = composes.get(id);
    if (!info) return;
    try {
      // Remove attached send button handler if present
      const sb = sendButtonMap.get(id);
      if (sb && sb.button) {
        try {
          if (sb.handler) sb.button.removeEventListener('click', sb.handler);
        } catch (e) { /* ignore */ }
        try { buttonHandlerMap.delete(sb.button); } catch (e) { /* ignore */ }
        try { attachedButtons.delete(sb.button); } catch (e) { /* ignore */ }
        try { sendButtonMap.delete(id); } catch (e) { /* ignore */ }
      }

      // Clear any flags on the node (safe best-effort)
      try {
        if (info.node) {
          try { delete info.node.__mtx_pixel_injected; } catch (e) { info.node.__mtx_pixel_injected = false; }
          try { delete info.node.__mtx_mtx_attached; } catch (e) { }
        }
      } catch (e) { /* ignore */ }
    } catch (err) {
      warn('unregisterCompose cleanup error', err);
    }

    // remove from tracked composes map
    try { composes.delete(id); } catch (e) { /* ignore */ }
    log('compose removed', id);
  }

  // ---------- Metadata extraction ----------
  function getSubject(composeEl) {
    const s = composeEl.querySelector('input[name="subjectbox"]') || document.querySelector('input[name="subjectbox"]');
    if (s) return s.value || '';
    // fallback: sometimes subject is not an input; try aria-label
    const alt = composeEl.querySelector('input[aria-label*="Subject"]');
    return alt ? (alt.value || '') : '';
  }

  function getRecipients(composeEl) {
    // Try a variety of recipient selectors; Gmail uses tokenized inputs that can be tricky
    const recipients = [];
    // primary 'to' field
    const toInputs = composeEl.querySelectorAll('textarea[name="to"], input[type="email"], input[name="to"], div[aria-label="To"]');
    toInputs.forEach((n) => {
      const v = n.value || n.textContent || n.getAttribute('data-legacy-email');
      if (v) recipients.push(v.trim());
    });
    // dedupe
    return Array.from(new Set(recipients.filter(Boolean)));
  }

  function getBodyHtml(composeEl) {
    const body = composeEl.querySelector('[aria-label="Message Body"]') || composeEl.querySelector('[role="textbox"][contenteditable]') || composeEl.querySelector('[contenteditable]');
    if (body) return body.innerHTML || '';
    return '';
  }

  // ---------- Send / Send button handling ----------
  // Map composeId -> chosen send button element and handler info
  const sendButtonMap = new Map();
  // WeakMap to track attached handlers so we can remove them later
  const buttonHandlerMap = new WeakMap();
  // WeakSet to mark buttons we've attached to (for safety)
  const attachedButtons = new WeakSet();

  // Small dictionary of common translations for "Send" used for locale-aware matching.
  const SEND_TRANSLATIONS = [
    'Send', 'Enviar', 'Envoyer', 'Invia', 'Senden', 'Enviar mensaje', 'Invia messaggio', 'Enviar mensagem', 'Enviar correo'
  ];

  // Helper: case-insensitive substring match against translations
  function matchesSendText(text) {
    if (!text) return false;
    const t = text.toLowerCase();
    return SEND_TRANSLATIONS.some((s) => t.indexOf(s.toLowerCase()) !== -1);
  }

  // Score a candidate button using multiple heuristics.
  // Returns { score, breakdown } for debugging.
  function scoreButtonCandidate(candidate, composeEl) {
    let score = 0;
    const breakdown = {};

    try {
      const tooltip = candidate.getAttribute('data-tooltip') || '';
      const aria = candidate.getAttribute('aria-label') || '';
      const ttId = candidate.getAttribute('data-tooltip-id');
      const ttPos = candidate.getAttribute('data-tooltip-position');

      // Heuristic: tooltip contains send / localized
      if (matchesSendText(tooltip)) { score += 10; breakdown.tooltip = true; }
      // aria-label contains send / localized
      if (matchesSendText(aria)) { score += 8; breakdown.aria = true; }

      // command key hints inside button (e.g., "Ctrl+Enter" or "⌘Enter")
      const txt = (candidate.textContent || '') + ' ' + tooltip + ' ' + aria;
      if (/ctrl\+enter|⌘enter|cmd\+enter|ctrl-enter/i.test(txt)) { score += 6; breakdown.cmdHint = true; }

      // located inside compose footer region
      if (isInComposeFooter(candidate, composeEl)) { score += 6; breakdown.footer = true; }

      // SVG paper plane heuristic: presence of svg gives bonus
      const svg = candidate.querySelector('svg');
      if (svg) { score += 4; breakdown.svg = true; try { if ((svg.innerHTML || '').toLowerCase().indexOf('plane') !== -1) { score += 2; breakdown.svgPlane = true; } } catch (e) {} }

      // attributes often present on action buttons
      if (ttId === 'tooltip') { score += 2; breakdown.ttId = true; }
      if (ttPos === 'top') { score += 1; breakdown.ttPos = true; }

      // First/last action button heuristics
      if (isFirstOrLastAction(candidate, composeEl)) { score += 3; breakdown.firstLast = true; }

      // Deductions: common non-send buttons
      const dedupeText = (tooltip + ' ' + aria + ' ' + (candidate.textContent || '')).toLowerCase();
      if (/archive|remove|trash|delete/i.test(dedupeText)) { score -= 8; breakdown.archive = true; }
      if (/format|fonts|bold|italic|underline|text color|remove formatting/i.test(dedupeText)) { score -= 6; breakdown.formatting = true; }
      if (/emoji|smile|insert emoji/i.test(dedupeText)) { score -= 4; breakdown.emoji = true; }
      if (/attach|attachment|paperclip|insert files|drive/i.test(dedupeText)) { score -= 5; breakdown.attachment = true; }
    } catch (err) {
      // be safe: don't throw
      warn('scoreButtonCandidate error', err);
    }

    return { score, breakdown };
  }

  // Heuristic: determine if candidate is inside a compose footer-like container
  function isInComposeFooter(candidate, composeEl) {
    try {
      // Look for nearest ancestor that looks like a toolbar/footer inside the compose
      const footer = candidate.closest('[role="toolbar"], [data-tooltip-id], [aria-label*="More"], [aria-label*="Actions"]');
      if (footer && composeEl.contains(footer)) return true;
      // Fallback: if candidate is after the message body in DOM order, treat as footer
      const body = composeEl.querySelector('[aria-label="Message Body"], [role="textbox"][contenteditable], [contenteditable]');
      if (body) {
        try {
          const bodyRect = body.getBoundingClientRect();
          const candRect = candidate.getBoundingClientRect();
          if (candRect.top >= bodyRect.bottom - 4) return true;
        } catch (e) {
          // ignore layout read errors
        }
      }
    } catch (err) { /* ignore */ }
    return false;
  }

  function isFirstOrLastAction(candidate, composeEl) {
    try {
      const footer = candidate.closest('[role="toolbar"], [data-tooltip-id], [aria-label*="More"], [aria-label*="Actions"]');
      if (!footer) return false;
      const buttons = Array.from(footer.querySelectorAll('div[role="button"]'));
      if (buttons.length === 0) return false;
      return buttons[0] === candidate || buttons[buttons.length - 1] === candidate;
    } catch (err) { return false; }
  }

  // Find and attach a single send button for this compose
  function attachSendHandler(composeId, composeEl) {
    try {
      const candidates = Array.from(composeEl.querySelectorAll('div[role="button"]'));
      if (DEBUG) log('candidates for', composeId, candidates);
      if (!candidates || candidates.length === 0) {
        if (DEBUG) warn('no button candidates found for', composeId);
        return;
      }

      // Score each candidate
      const scored = candidates.map((c) => ({ el: c, ...scoreButtonCandidate(c, composeEl) }));
      if (DEBUG) log('scoring breakdown', scored.map(s => ({ score: s.score, breakdown: s.breakdown, el: s.el }))).

      // Choose highest score
      scored.sort((a, b) => b.score - a.score);
      let chosen = scored[0];

      // If top score is non-positive, use structural fallback
      if (!chosen || chosen.score <= 0) {
        if (DEBUG) warn('scoring failed, using structural fallback for', composeId);
        // fallback: find footer and pick first role=button within it
        const footer = composeEl.querySelector('[role="toolbar"], [data-tooltip-id], [aria-label*="More"], [aria-label*="Actions"]');
        if (footer) {
          const btn = footer.querySelector('div[role="button"]');
          if (btn) {
            chosen = { el: btn, score: 0, breakdown: { fallback: true } };
          }
        }
        // last resort: pick first or last button under compose
        if (!chosen) {
          const all = Array.from(composeEl.querySelectorAll('div[role="button"]'));
          if (all.length) chosen = { el: all[all.length - 1], score: 0, breakdown: { fallback_last: true } };
        }
      }

      if (!chosen || !chosen.el) {
        warn('no send button chosen for compose', composeId);
        return;
      }

      const buttonEl = chosen.el;
      if (DEBUG) log('chosen send button for', composeId, chosen);

      // Attach listener once per compose window
      if (sendButtonMap.has(composeId)) {
        // already attached
        return;
      }

      // Create handler and attach
      const handler = createSendClickHandler(composeId, composeEl);
      buttonEl.addEventListener('click', handler);
      buttonHandlerMap.set(buttonEl, handler);
      attachedButtons.add(buttonEl);
      sendButtonMap.set(composeId, { button: buttonEl, handler });
    } catch (err) {
      warn('attachSendHandler error', err);
    }
  }

  function createSendClickHandler(composeId, composeEl) {
    return async function (e) {
      try {
        log('send clicked for', composeId);
        const subject = getSubject(composeEl);
        const recipients = getRecipients(composeEl);
        const bodyHtml = getBodyHtml(composeEl);
        const payload = { subject, recipients, bodyHtml };
        window.postMessage({ source: SOURCE, type: 'compose:send', payload: Object.assign({ composeId }, payload) }, '*');
        const emailId = await waitForEmailCreateResponse(composeId);
        if (emailId) {
          log('received emailId', emailId, 'for', composeId);
          const injected = injectPixel(composeEl, emailId);
          if (injected) log('pixel injected', composeId, emailId);
          await rewriteLinks(composeEl, emailId);
        } else {
          warn('no emailId returned from background for', composeId);
        }
      } catch (err) {
        warn('send handler error', err);
      }
    };
  }

  function waitForEmailCreateResponse(composeId, timeout = 5000) {
    return new Promise((resolve) => {
      const handle = (event) => {
        if (!event.data || event.source !== window) return;
        const msg = event.data;
        if (msg.source !== 'mailtracex-extension') return;
        if (msg.type === 'email:create:response' && msg.resp) {
          const resp = msg.resp;
          if (resp.ok && resp.emailId) {
            window.removeEventListener('message', handle);
            resolve(resp.emailId);
          } else {
            window.removeEventListener('message', handle);
            resolve(null);
          }
        }
      };
      window.addEventListener('message', handle);
      // timeout
      setTimeout(() => {
        window.removeEventListener('message', handle);
        resolve(null);
      }, timeout);
    });
  }

  // ---------- Pixel injection ----------
  function injectPixel(composeEl, emailId) {
    try {
      const bodyEl = composeEl.querySelector('[aria-label="Message Body"]') || composeEl.querySelector('[role="textbox"][contenteditable]') || composeEl.querySelector('[contenteditable]');
      if (!bodyEl) return false;
      // Avoid injecting twice
      if (composeEl.__mtx_pixel_injected) return true;
      const img = document.createElement('img');
      img.src = `http://localhost:4000/api/pixel?t=${encodeURIComponent(emailId)}`;
      img.alt = '';
      img.style.width = '1px';
      img.style.height = '1px';
      img.style.opacity = '0';
      img.style.display = 'inline-block';
      bodyEl.appendChild(img);
      composeEl.__mtx_pixel_injected = true;
      return true;
    } catch (err) {
      warn('injectPixel failed', err);
      return false;
    }
  }

  // ---------- Link rewriting ----------
  async function rewriteLinks(composeEl, emailId) {
    const bodyEl = composeEl.querySelector('[aria-label="Message Body"]') || composeEl.querySelector('[role="textbox"][contenteditable]') || composeEl.querySelector('[contenteditable]');
    if (!bodyEl) return;
    const anchors = Array.from(bodyEl.querySelectorAll('a[href]'));
    // For each anchor, request rewrite and update href
    for (const a of anchors) {
      const original = a.href;
      if (!original) continue;
      try {
        // Post message; contentScript will forward and return rewritten url
        const rewritten = await requestRewrite(emailId, original);
        if (rewritten) {
          try { a.href = rewritten; } catch (err) { /* ignore cross-origin setter issues */ }
          log('link rewritten', original, '->', rewritten);
        }
      } catch (err) {
        warn('rewriteLinks error for', original, err);
      }
    }
  }

  function requestRewrite(emailId, original, timeout = 4000) {
    return new Promise((resolve) => {
      const token = uid();
      const handle = (event) => {
        if (!event.data || event.source !== window) return;
        const msg = event.data;
        if (msg.source !== 'mailtracex-extension') return;
        if (msg.type === 'link:rewrite:response' && msg.original === original) {
          window.removeEventListener('message', handle);
          resolve(msg.rewritten || null);
        }
      };
      window.addEventListener('message', handle);
      // send request to contentScript which will call background
      window.postMessage({ source: SOURCE, type: 'compose:rewriteLink', emailId, url: original }, '*');
      setTimeout(() => { window.removeEventListener('message', handle); resolve(null); }, timeout);
    });
  }

  // ---------- MutationObserver strategy ----------
  const processMutations = debounce((mutations) => {
    try {
      // Find newly added compose elements
      const found = findComposeElements(document);
      found.forEach((el) => registerCompose(el));

      // detect removed compose nodes and clean up
      for (const [id, info] of composes.entries()) {
        if (!document.contains(info.node)) {
          unregisterCompose(id);
        }
      }
    } catch (err) {
      warn('processMutations error', err);
    }
  }, 200);

  const observer = new MutationObserver((mutations) => processMutations(mutations));
  observer.observe(document.body, { childList: true, subtree: true });

  // Initial scan
  try { findComposeElements(document).forEach((el) => registerCompose(el)); } catch (err) { warn('initial scan failed', err); }

  // Listen for extension messages (e.g., responses)
  window.addEventListener('message', (event) => {
    if (!event.data || event.source !== window) return;
    const msg = event.data;
    if (msg.source !== 'mailtracex-extension') return;
    // Handled elsewhere by waiting promises; keep for future events
    if (DEBUG) console.log('gmail.js got ext message', msg);
  });

  // expose utilities for debugging (optional)
  window.__mailtracex = { composes };
})();
