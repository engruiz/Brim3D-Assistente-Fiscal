// Klipper / Moonraker (Snapmaker U1, Creality K1/K2, Elegoo Neptune 4, QIDI, Voron…): API HTTP na porta 7125.
const MAPA = { printing: "imprimindo", paused: "pausado", error: "erro", complete: "concluido", standby: "parado", cancelled: "parado" };

async function getJson(url, ms = 4000) {
  const r = await fetch(url, { signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function consultarMoonraker(ip, porta = 7125) {
  const base = `http://${ip}:${porta}`;
  const q = "print_stats&virtual_sdcard&display_status&extruder&heater_bed&gcode_move&webhooks";
  const j = (await getJson(`${base}/printer/objects/query?${q}`)).result?.status || {};
  const ps = j.print_stats || {};
  const prog = j.display_status?.progress ?? j.virtual_sdcard?.progress ?? 0;
  const pct = Math.max(0, Math.min(100, Math.round(prog * 100)));
  let status = MAPA[ps.state] || "parado";
  if (j.webhooks?.state && j.webhooks.state !== "ready") status = "erro";
  const dur = Number(ps.print_duration || 0);
  const restante = status === "imprimindo" && prog > 0.01 ? Math.max(0, Math.round((dur / prog - dur) / 60)) : 0;
  return {
    status,
    progress_pct: status === "concluido" ? 100 : pct,
    nozzle_temp: Number(j.extruder?.temperature || 0), nozzle_target_temp: Number(j.extruder?.target || 0),
    bed_temp: Number(j.heater_bed?.temperature || 0), bed_target_temp: Number(j.heater_bed?.target || 0),
    remaining_time_min: restante,
    current_file: ps.filename || "",
    layer_current: Number(ps.info?.current_layer || 0), layer_total: Number(ps.info?.total_layer || 0),
    speed_pct: Math.round(Number(j.gcode_move?.speed_factor || 1) * 100),
    ams_trays: [], hms_alert: status === "erro", wifi_signal: "",
  };
}

// Confirma que o IP é um Moonraker e devolve o nome da máquina (para a descoberta).
export async function identificarMoonraker(ip, ms = 900) {
  const j = (await getJson(`http://${ip}:7125/printer/info`, ms)).result;
  if (!j) throw new Error("não é Moonraker");
  return { hostname: j.hostname || "", versao: j.software_version || "" };
}
