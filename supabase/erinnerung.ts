// Ellie – Erinnerungen per Web Push. Supabase Edge Function "erinnerung".
// Bekommt von der Datenbank (pg_cron) die Geräte + Nachricht und schickt die Push-Nachricht.
// Ohne externe Libraries: Verschlüsselung (RFC 8291) und VAPID (RFC 8292) mit WebCrypto.

const TOKEN = "__TOKEN__";
const VAPID_PUBLIC = "__VAPID_PUBLIC__";
const VAPID_PRIVATE_JWK = __VAPID_JWK__;
const SUBJECT = "https://hauerbebe-cmyk.github.io/Ellie/";

const te = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const cat = (...parts) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };

async function hkdf(salt, ikm, info, len) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, len * 8));
}

export async function vapidJwt(audience) {
  const header = b64u(te.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(te.encode(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT })));
  const key = await crypto.subtle.importKey("jwk", VAPID_PRIVATE_JWK, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, te.encode(`${header}.${claims}`));
  return `${header}.${claims}.${b64u(sig)}`;
}

export async function encrypt(sub, text) {
  const uaPublic = unb64u(sub.keys.p256dh), authSecret = unb64u(sub.keys.auth);
  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, eph.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, cat(te.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, te.encode("Content-Encoding: nonce\0"), 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, cat(te.encode(text), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return cat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

export async function sendPush(sub, text) {
  const url = new URL(sub.endpoint);
  const jwt = await vapidJwt(`${url.protocol}//${url.host}`);
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      TTL: "86400", Urgency: "high",
      "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream",
      Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC}`,
    },
    body: await encrypt(sub, text),
  });
  return { status: res.status, endpoint: url.host, info: res.ok ? "" : (await res.text()).slice(0, 200) };
}

if (typeof Deno !== "undefined") Deno.serve(async (req) => {
  if (req.headers.get("x-ellie-token") !== TOKEN) return new Response("nicht erlaubt", { status: 401 });
  const { subs = [], title = "Ellie", body = "", tag = "ellie" } = await req.json().catch(() => ({}));
  const text = JSON.stringify({ title, body, tag });
  const results = await Promise.all(subs.map((s) => sendPush(s, text).catch((e) => ({ status: 0, info: String(e) }))));
  return Response.json({ sent: results.filter((r) => r.status >= 200 && r.status < 300).length, results });
});
