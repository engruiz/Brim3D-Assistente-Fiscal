// Prusa (MK4, XL, Mini, MK3 com Raspberry Pi) via PrusaLink: API v1 com chave de API.
import { getJson, hostPorta } from "./http.js";

const MAPA = { PRINTING: "imprimindo", PAUSED: "pausado", FINISHED: "concluido", ERROR: "erro", ATTENTION: "erro", IDLE: "parado", STOPPED: "parado", BUSY: "parado", READY: "parado" };

export async function consultarPrusaLink(ip, chave) {
  const base = `http://${hostPorta(ip)}`;
  const h = { "X-Api-Key": chave };
  let s;
  try { s = await getJson(`${base}/api/v1/status`, { headers: h }); }
  catch (e) {
    if (e.status === 401 || e.status === 403) { const er = new Error("Chave de API incorreta"); er.credencial = true; throw er; }
    throw e;
  }
  const p = s.printer || {}, j = s.job || {};
  const status = MAPA[String(p.state || "").toUpperCase()] || "parado";
  let arquivo = "";
  if (status === "imprimindo" || status === "pausado") {
    const jb = await getJson(`${base}/api/v1/job`, { headers: h }).catch(() => ({}));
    arquivo = jb.file?.display_name || jb.file?.name || "";
  }
  return {
    status,
    progress_pct: status === "concluido" ? 100 : Math.round(Number(j.progress || 0)),
    nozzle_temp: Number(p.temp_nozzle || 0), nozzle_target_temp: Number(p.target_nozzle || 0),
    bed_temp: Number(p.temp_bed || 0), bed_target_temp: Number(p.target_bed || 0),
    remaining_time_min: status === "imprimindo" ? Math.round(Number(j.time_remaining || 0) / 60) : 0,
    current_file: arquivo,
    layer_current: 0, layer_total: 0, speed_pct: Number(p.speed || 100), ams_trays: [], hms_alert: status === "erro", wifi_signal: "",
  };
}
