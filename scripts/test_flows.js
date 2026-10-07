import crypto from "node:crypto";

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const HMAC_SECRET = process.env.HMAC_SECRET;

if (!HMAC_SECRET) {
  console.error("Set dulu environment variable HMAC_SECRET (sama dengan di server).");
  process.exit(1);
}

const payload = { status: "BAHAYA", level: 3, message: "Percobaan akses tidak sah ke tabel users" };
const body = JSON.stringify(payload);
const signatureBenar = crypto.createHmac("sha256", HMAC_SECRET).update(body).digest("hex");

// Merusak signature: ubah karakter terakhir
const signatureRusak =
  signatureBenar.slice(0, -1) + (signatureBenar.endsWith("0") ? "1" : "0");

async function kirim(headerTambahan) {
  const res = await fetch(`${BASE_URL}/api/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headerTambahan },
    body,
  });
  return res.status;
}

const skenario = [
  { nama: "Test 1 - Valid",    header: { "x-signature": signatureBenar }, harapan: 200 },
  { nama: "Test 2 - Tampered", header: { "x-signature": signatureRusak }, harapan: 401 },
  { nama: "Test 3 - Missing",  header: {},                                harapan: 400 },
];

let lulus = 0;
let gagal = 0;

for (const s of skenario) {
  try {
    const status = await kirim(s.header);
    const ok = status === s.harapan;
    ok ? lulus++ : gagal++;
    console.log(`${ok ? "PASSED" : "FAILED"} | ${s.nama} | harapan ${s.harapan}, diterima ${status}`);
  } catch (err) {
    gagal++;
    console.log(`FAILED | ${s.nama} | error: ${err.message}`);
  }
}

console.log(`\n${lulus} passed, ${gagal} failed`);
process.exit(gagal === 0 ? 0 : 1);
