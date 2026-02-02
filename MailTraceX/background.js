// background.js — Mail TraceX (final MV3 keepalive)


importScripts("utils/storage.js");


console.log("[MailTraceX][background] service worker started");

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  // Keepalive ping
  if (msg.type === "ping") {
    sendResponse({ ok: true });
    return true;
  }

  // Email create request
  if (msg.type === "email:create") {
    console.log("[MailTraceX][background] email:create received", msg.payload);

     // 🔹 Give Chrome a tick to fully lock the worker as active
    await new Promise(r => setTimeout(r, 0));
    const token = await getToken();

    fetch("http://localhost:4000/api/emails", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
       },
      body: JSON.stringify(msg.payload)
    })
      .then(async r => {
        const text = await r.text();
        try {
          return JSON.parse(text);
        } catch {
          console.error("[MailTraceX][background] Non‑JSON response:", text);
          throw new Error("Backend returned non‑JSON response");
        }
      })

      .then(data => {
        console.log("[MailTraceX][background] email:create success", data);
        sendResponse({ ok: true, emailId: data.emailId });
      })
      .catch(err => {
        console.error("[MailTraceX][background] email:create error", err);
        sendResponse({ ok: false, error: err.message });
      });

    return true; // keep channel open
  }
});
