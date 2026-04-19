/**
 * NexoraxMail — Cloudflare Email Worker
 * Paste toàn bộ file này vào Cloudflare Worker editor, nhấn Deploy.
 *
 * Environment Variables cần thêm (Settings → Variables):
 *   API_URL         = https://nexorax.cloud/api/tempmail/receive
 *   WEBHOOK_SECRET  = <chuỗi bất kỳ, ví dụ: nexora_secret_2026>
 *
 * KHÔNG cần cài npm, không cần Wrangler CLI.
 */

export default {
  async email(message, env, _ctx) {
    const subject = message.headers.get("subject") ?? "(Không có tiêu đề)";
    const date = message.headers.get("date") ?? new Date().toISOString();

    // Đọc raw email
    const raw = await new Response(message.raw).text();

    let text = "";
    let html = "";

    if (raw.includes("Content-Type: multipart/")) {
      // Email multipart — tách từng phần
      const boundaryMatch = raw.match(/boundary="?([^"\r\n;]+)"?/i);
      const boundary = boundaryMatch ? boundaryMatch[1] : null;
      const parts = boundary ? raw.split(`--${boundary}`) : [raw];

      for (const part of parts) {
        const lower = part.toLowerCase();
        const sep = part.indexOf("\r\n\r\n");
        if (sep === -1) continue;
        const headers = part.slice(0, sep);
        let body = part.slice(sep + 4).replace(/\r\n--[\s\S]*$/, "").trim();

        const isBase64 = /content-transfer-encoding:\s*base64/i.test(headers);
        const isQP = /content-transfer-encoding:\s*quoted-printable/i.test(headers);

        if (isBase64) {
          try { body = decodeURIComponent(escape(atob(body.replace(/\s/g, "")))); } catch { /* keep raw */ }
        } else if (isQP) {
          body = body
            .replace(/=\r\n/g, "")
            .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
        }

        if (lower.includes("content-type: text/plain") && !text) text = body;
        if (lower.includes("content-type: text/html") && !html) html = body;
      }
    } else {
      // Email đơn giản
      const sep = raw.indexOf("\r\n\r\n");
      if (sep !== -1) text = raw.slice(sep + 4).trim();
    }

    const payload = {
      to: message.to,
      from: message.from,
      subject,
      text: text.trim(),
      html: html.trim(),
      date,
    };

    const apiUrl = env.API_URL ?? "https://nexorax.cloud/api/tempmail/receive";
    const secret = env.WEBHOOK_SECRET ?? "";

    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-webhook-secret": secret } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      // Log lỗi nhưng không throw để email không bị bounce
      console.error("NexoraxMail webhook error:", resp.status, await resp.text());
    }
  },
};
