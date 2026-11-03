// Utilidades de HTTP/endereço compartilhadas pelos leitores.
export function hostPorta(valor, portaPadrao) {
  const v = String(valor || "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (/:\d+$/.test(v)) return v;
  return portaPadrao ? `${v}:${portaPadrao}` : v;
}

export async function getJson(url, { headers = {}, ms = 5000 } = {}) {
  const r = await fetch(url, { headers: { Accept: "application/json", ...headers }, signal: AbortSignal.timeout(ms) });
  if (!r.ok) { const e = new Error(`HTTP ${r.status}`); e.status = r.status; throw e; }
  return r.json();
}
