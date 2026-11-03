// OctoPrint (Ender, Creality e outras com Raspberry Pi): API REST com chave de API.
import { getJson, hostPorta } from "./http.js";

export async function consultarOctoPrint(ip, chave) {
  const base = `http://${hostPorta(ip)}`;
  const h = { "X-Api-Key": chave };
  let imp;
  try { imp = await getJson(`${base}/api/printer`, { headers: h }); }
  catch (e) {
    if (e.status === 401 || e.status === 403) { const er = new Error("Chave de API incorreta"); er.credencial = true; throw er; }
    if (e.status === 409) return { status: "offline", erro: "OctoPrint sem a impressora conectada" };
    throw e;
  }
  const job = await getJson(`${base}/api/job`, { headers: h }).catch(() => ({}));
  const f = imp.state?.flags || {};
  const pct = Math.round(Number(job.progress?.completion || 0));
  let status = "parado";
  if (f.error || f.closedOrError) status = "erro";
  else if (f.paused || f.pausing) status = "pausado";
  else if (f.printing) status = "imprimindo";
  else if (f.operational && pct >= 100) status = "concluido";
  const t = imp.temperature || {};
  return {
    status,
    progress_pct: status === "concluido" ? 100 : pct,
    nozzle_temp: Number(t.tool0?.actual || 0), nozzle_target_temp: Number(t.tool0?.target || 0),
    bed_temp: Number(t.bed?.actual || 0), bed_target_temp: Number(t.bed?.target || 0),
    remaining_time_min: status === "imprimindo" ? Math.round(Number(job.progress?.printTimeLeft || 0) / 60) : 0,
    current_file: job.job?.file?.display || job.job?.file?.name || "",
    layer_current: 0, layer_total: 0, speed_pct: 100, ams_trays: [], hms_alert: status === "erro", wifi_signal: "",
  };
}
