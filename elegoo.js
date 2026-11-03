// Elegoo Centauri Carbon (e outras com SDCP v3): WebSocket em ws://IP:3030/websocket, sem senha.
const conexoes = new Map(); // ip -> Conexao

// Estado da máquina (CurrentStatus) e da impressão (PrintInfo.Status). A tabela de códigos varia um pouco
// entre firmwares, então combinamos os dois campos em vez de confiar num só.
export function traduzirStatus(s) {
  const maquina = Array.isArray(s.CurrentStatus) ? s.CurrentStatus : [s.CurrentStatus];
  const pi = s.PrintInfo || {};
  const ps = Number(pi.Status);
  if (ps === 14) return "erro";
  if ([5, 6, 10].includes(ps)) return "pausado";
  if (maquina.includes(1) || [13, 1, 15, 16, 20].includes(ps)) return "imprimindo";
  if (ps === 9) return "concluido";
  return "parado";
}

class Conexao {
  constructor(ip, log) {
    this.ip = ip; this.log = log; this.status = null; this.mainboard = ""; this.ultimo = 0; this.erro = ""; this.fechado = false;
    this.abrir();
  }
  abrir() {
    if (this.fechado) return;
    let ws;
    try { ws = new WebSocket(`ws://${this.ip}:3030/websocket`); } catch (e) { this.erro = e.message; return this.religar(); }
    this.ws = ws;
    ws.onopen = () => { this.erro = ""; this.pedir(); this.timer = setInterval(() => this.pedir(), 5000); };
    ws.onmessage = (ev) => {
      try {
        const j = JSON.parse(typeof ev.data === "string" ? ev.data : Buffer.from(ev.data).toString());
        if (j.MainboardID) this.mainboard = j.MainboardID;
        if (j.Status) { this.status = { ...(this.status || {}), ...j.Status }; this.ultimo = Date.now(); }
      } catch { /* ignora */ }
    };
    ws.onerror = () => { this.erro = "sem conexão"; };
    ws.onclose = () => { clearInterval(this.timer); this.ws = null; this.religar(); };
  }
  religar() { if (!this.fechado) setTimeout(() => this.abrir(), 10000); }
  pedir() {
    try {
      this.ws?.send(JSON.stringify({ Id: "", Data: { Cmd: 0, Data: {}, RequestID: Math.random().toString(16).slice(2), MainboardID: this.mainboard || "", TimeStamp: Date.now(), From: 1 } }));
    } catch { /* ignora */ }
  }
  fechar() { this.fechado = true; clearInterval(this.timer); try { this.ws?.close(); } catch { /* ok */ } }
}

export function garantirElegoo({ ip, log }) {
  if (!conexoes.has(ip)) conexoes.set(ip, new Conexao(ip, log));
}
export function pararElegooQueSobrou(ipsAtivos) {
  for (const [ip, c] of conexoes) if (!ipsAtivos.has(ip)) { c.fechar(); conexoes.delete(ip); }
}

export function lerElegoo(ip) {
  const c = conexoes.get(ip);
  if (!c) return null;
  if (!c.status || Date.now() - c.ultimo > 40000) return { status: "offline", erro: c.erro || "aguardando dados" };
  const s = c.status, pi = s.PrintInfo || {};
  const status = traduzirStatus(s);
  const total = Number(pi.TotalTicks || 0), atual = Number(pi.CurrentTicks || 0);
  const seg = (v) => (total > 1e6 ? v / 1000 : v); // alguns firmwares enviam em milissegundos
  let pct = Number(pi.Progress);
  if (!Number.isFinite(pct) || pct <= 0) pct = total > 0 ? (atual / total) * 100 : (Number(pi.TotalLayer) > 0 ? (Number(pi.CurrentLayer) / Number(pi.TotalLayer)) * 100 : 0);
  return {
    status,
    progress_pct: status === "concluido" ? 100 : Math.max(0, Math.min(100, Math.round(pct))),
    nozzle_temp: Number(s.TempOfNozzle || 0), nozzle_target_temp: Number(s.TempTargetNozzle || 0),
    bed_temp: Number(s.TempOfHotbed || 0), bed_target_temp: Number(s.TempTargetHotbed || 0),
    remaining_time_min: status === "imprimindo" && total > 0 ? Math.max(0, Math.round((seg(total) - seg(atual)) / 60)) : 0,
    current_file: pi.Filename || "",
    layer_current: Number(pi.CurrentLayer || 0), layer_total: Number(pi.TotalLayer || 0),
    speed_pct: Number(pi.PrintSpeedPct || pi.PrintSpeed || s.PrintSpeed || 100),
    ams_trays: [], hms_alert: status === "erro", wifi_signal: "",
  };
}
