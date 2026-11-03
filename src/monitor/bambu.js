// Bambu Lab pela rede local: MQTT com TLS na porta 8883 (usuário "bblp", senha = código de acesso da impressora).
// Funciona em qualquer impressora Bambu acessível na rede (modo LAN, e em geral também no modo nuvem).
import mqtt from "mqtt";

const MAPA = { RUNNING: "imprimindo", PREPARE: "imprimindo", SLICING: "imprimindo", PAUSE: "pausado", FAILED: "erro", FINISH: "concluido", IDLE: "parado" };
const VELOCIDADE = { 1: 50, 2: 100, 3: 124, 4: 166 };

class Conexao {
  constructor(serial, ip, codigo, log) {
    this.serial = serial; this.ip = ip; this.codigo = codigo; this.log = log;
    this.estado = {}; this.conectado = false; this.recebeu = false; this.erro = "";
    this.client = mqtt.connect({ protocol: "mqtts", host: ip, port: 8883, username: "bblp", password: codigo, rejectUnauthorized: false, clientId: `brim3d_${Math.random().toString(16).slice(2, 10)}`, reconnectPeriod: 10000, connectTimeout: 8000, keepalive: 30 });
    this.client.on("connect", () => {
      this.conectado = true; this.erro = "";
      this.client.subscribe(`device/${serial}/report`);
      this.pushall();
      this.timer = setInterval(() => this.pushall(), 5 * 60000);
    });
    this.client.on("message", (_t, buf) => {
      try {
        const j = JSON.parse(buf.toString());
        if (j.print) { this.estado = { ...this.estado, ...j.print }; this.recebeu = true; this.ultimo = Date.now(); }
      } catch { /* mensagem inválida */ }
    });
    this.client.on("close", () => { this.conectado = false; clearInterval(this.timer); });
    this.client.on("error", (e) => { this.erro = /Not authorized|Bad username/i.test(e.message) ? "Código de acesso incorreto" : e.message; });
  }
  pushall() {
    try { this.client.publish(`device/${this.serial}/request`, JSON.stringify({ pushing: { sequence_id: "0", command: "pushall" } })); } catch { /* ignora */ }
  }
  fechar() { clearInterval(this.timer); try { this.client.end(true); } catch { /* ignora */ } }
}

const conexoes = new Map(); // serial -> Conexao

export function garantirBambu({ serial, ip, codigo, log }) {
  const atual = conexoes.get(serial);
  if (atual && (atual.ip !== ip || atual.codigo !== codigo)) { atual.fechar(); conexoes.delete(serial); }
  if (!conexoes.has(serial)) conexoes.set(serial, new Conexao(serial, ip, codigo, log));
}

export function pararBambuQueSobrou(seriaisAtivos) {
  for (const [s, c] of conexoes) if (!seriaisAtivos.has(s)) { c.fechar(); conexoes.delete(s); }
}

export function lerBambu(serial) {
  const c = conexoes.get(serial);
  if (!c) return null;
  if (!c.conectado || !c.recebeu) return { status: "offline", erro: c.erro || (c.conectado ? "aguardando dados" : "sem conexão") };
  const p = c.estado;
  const trays = [];
  const tray_now = String(p.ams?.tray_now ?? "");
  for (const unidade of p.ams?.ams || []) {
    for (const t of unidade.tray || []) {
      const id = `${unidade.id ?? 0}-${t.id}`;
      trays.push({ tray_id: id, type: t.tray_type || "", color: t.tray_color ? `#${String(t.tray_color).slice(0, 6)}` : "", active: tray_now === String(Number(unidade.id || 0) * 4 + Number(t.id)) });
    }
  }
  return {
    status: MAPA[p.gcode_state] || "parado",
    progress_pct: Math.round(Number(p.mc_percent || 0)),
    nozzle_temp: Number(p.nozzle_temper || 0), nozzle_target_temp: Number(p.nozzle_target_temper || 0),
    bed_temp: Number(p.bed_temper || 0), bed_target_temp: Number(p.bed_target_temper || 0),
    remaining_time_min: Number(p.mc_remaining_time || 0),
    current_file: p.subtask_name || p.gcode_file || "",
    layer_current: Number(p.layer_num || 0), layer_total: Number(p.total_layer_num || 0),
    speed_pct: VELOCIDADE[p.spd_lvl] || 100,
    ams_trays: trays, hms_alert: Array.isArray(p.hms) && p.hms.length > 0, wifi_signal: p.wifi_signal || "",
  };
}

export function errosBambu(serial) { return conexoes.get(serial)?.erro || ""; }
