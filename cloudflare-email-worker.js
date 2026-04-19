/**
 * Cloudflare Email Worker — NexoraxMail
 * Deploy tại: Cloudflare Dashboard → Email → Email Routing → Workers
 *
 * Cách dùng:
 * 1. Vào Cloudflare Dashboard → nexorax.cloud → Email → Email Routing
 * 2. Bật Email Routing, set MX records (CF tự hướng dẫn)
 * 3. Tạo Catch-all Rule → Action: Send to Worker → chọn worker này
 * 4. Thêm Worker Secret: WEBHOOK_SECRET = <chuỗi bí mật tuỳ chọn>
 *    (phải khớp với env var TEMPMAIL_WEBHOOK_SECRET trên server)
 * 5. Thêm Worker env var: API_URL = https://nexorax.cloud/api/tempmail/receive
 *
 * Dependencies: postal-mime (npm install postal-mime hoặc dùng CDN)
 */

import PostalMime from "postal-mime";

export default {
  async email(message, env, _ctx) {
    let text = "";
    let html = "";
    let subject = "";

    try {
      const rawBytes = await new Response(message.raw).arrayBuffer();
      const parser = new PostalMime();
      const parsed = await parser.parse(rawBytes);
      text = parsed.text ?? "";
      html = parsed.html ?? "";
      subject = parsed.subject ?? message.headers?.get("subject") ?? "";
    } catch {
      text = "(Không thể parse nội dung email)";
    }

    const payload = {
      to: message.to,
      from: message.from,
      subject,
      text,
      html,
      date: new Date().toISOString(),
    };

    const apiUrl = env.API_URL ?? "https://nexorax.cloud/api/tempmail/receive";
    const secret = env.WEBHOOK_SECRET ?? "";

    await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-webhook-secret": secret } : {}),
      },
      body: JSON.stringify(payload),
    });
  },
};
