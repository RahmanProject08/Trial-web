import crypto from "node:crypto";

export default async function handler(req, res) {
  // Hanya menerima POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ status: "error", message: "Method Not Allowed" });
  }

  // (a) Header x-signature wajib ada -> jika tidak, 400
  const signature = req.headers["x-signature"];
  if (!signature) {
    return res.status(400).json({ status: "error", message: "Header x-signature tidak ada" });
  }

  const { HMAC_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
  if (!HMAC_SECRET || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return res.status(500).json({ status: "error", message: "Environment variable server belum lengkap" });
  }

  // (b) Ambil isi body sebagai string
  const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});

  // (c) Hitung HMAC-SHA256 dari body memakai HMAC_SECRET
  const expected = crypto.createHmac("sha256", HMAC_SECRET).update(body).digest("hex");

  // (d) Bandingkan dengan perbandingan string biasa, (e) tolak jika tidak cocok
  if (expected !== signature) {
    const sidik = crypto.createHash("sha256").update(HMAC_SECRET).digest("hex").slice(0, 8);
    return res.status(401).json({ status: "error", message: "Signature tidak valid", debug_sidik: sidik });
  }

  // HMAC valid -> baca payload dan kirim alert Telegram
  const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const status = String(data?.status ?? "").toUpperCase();
  const level = Number(data?.level);
  const pesan = String(data?.message ?? "").slice(0, 500);

  if (!["AMAN", "BAHAYA"].includes(status) || !Number.isInteger(level) || level < 0 || level > 3) {
    return res.status(400).json({
      status: "error",
      message: "Payload tidak valid (status AMAN/BAHAYA, level 0-3)",
    });
  }

  const ikon = status === "BAHAYA" ? "\u{1F6A8}" : "\u2705"; // sirene / centang
  const teks =
    `${ikon} ALERT KEAMANAN DATABASE\n` +
    `Status: ${status}\n` +
    `Level ancaman: ${level}\n` +
    `Detail: ${pesan || "-"}`;

  try {
    const tg = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: teks }),
    });
    if (!tg.ok) {
      return res.status(502).json({ status: "error", message: `Telegram menolak pesan (HTTP ${tg.status})` });
    }
  } catch (err) {
    return res.status(502).json({ status: "error", message: "Gagal menghubungi Telegram" });
  }

  return res.status(200).json({ status: "success", message: "Webhook valid, alert terkirim ke Telegram" });
}
