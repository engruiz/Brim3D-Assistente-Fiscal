// Anycubic Kobra 3 / S1 (firmware original) com o "Modo LAN" ligado na impressora:
// 1) GET http://IP:18910/info  2) POST assinado em ctrlInfoUrl  3) credenciais do MQTT local (TLS, porta 9883).
import crypto from "node:crypto";
import mqtt from "mqtt";
import { getJson } from "./http.js";

const md5 = (t) => crypto.createHash("md5").update(t).digest("hex");
const aleatorio = (n, alfabeto) => Array.from({ length: n }, () => alfabeto[crypto.randomInt(alfabeto.length)]).join("");
const A_Z = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", MIN = "abcdefghijklmnopqrstuvwxyz", NUM = "0123456789";

export async function lerInfoAnycubic(ip, ms = 5000) {
  const info = await getJson(`http://${ip}:18910/info`, { ms });
  if (!info || typeof info !== "object" || !info.cn) throw new Error("não é uma Anycubic");
  return info;
}

async function handshake(ip) {
  const info = await lerInfoAnycubic(ip);
  if (info.ctrlType === "cloud") throw Object.assign(new Error("Modo LAN desligado na impressora (Configurações › Rede › Modo LAN)"), { modoLan: true });
  if (!info.token || !info.ctrlInfoUrl || !info.modelId) throw new Error("Esta Anycubic não usa o protocolo LAN suportado (Kobra 3 / S1)");
  const ts = Date.now(), nonce = aleatorio(6, A_Z + MIN + NUM), did = aleatorio(32, A_Z + NUM);
  const sign = md5(md5(String(info.token).slice(0, 16)) + String(ts) + nonce);
  // O endereço de destino é SEMPRE o IP informado (nunca um host escolhido pela resposta); só o caminho vem da impressora.
  const u = new URL(String(info.ctrlInfoUrl), `http://${ip}:18910`);
  const alvo = `http://${ip}:${u.port || 18910}${u.pathname}?${u.search ? u.search.slice(1) + "&" : ""}${new URLSearchParams({ ts, nonce, sign, did })}`;
  const r = await fetch(alvo, { method: "POST", redirect: "error", signal: AbortSignal.timeout(6000) });
  const j = await r.json();
  if (j.code !== 200 || !j.data?.info || !j.data?.token) throw new Error(`Handshake recusado (${j.message || r.status})`);
  const chave = Buffer.from(String(info.token).slice(16, 32), "latin1");
  const iv = Buffer.alloc(16); Buffer.from(String(j.data.token), "latin1").copy(iv, 0, 0, 16);
  const dec = crypto.createDecipheriv("aes-128-cbc", chave, iv);
  const cred = JSON.parse(Buffer.concat([dec.update(Buffer.from(j.data.info, "base64")), dec.final()]).toString("utf8"));
  if (!cred.username || !cred.password || !cred.deviceId) throw new Error("Resposta inesperada da impressora");
  return { usuario: cred.username, senha: cred.password, deviceId: cred.deviceId, modelId: String(info.modelId), serial: info.cn };
}

class Conexao {
  constructor(ip, log) { this.ip = ip; this.log = log; this.estado = {}; this.recebeu = false; this.conectado = false; this.erro = ""; this.fechado = false; this.tentar(); }
  async tentar() {
    if (this.fechado) return;
    try {
      const h = await handshake(this.ip);
      this.h = h; this.erro = "";
      this.client = mqtt.connect({ protocol: "mqtts", host: this.ip, port: 9883, username: h.usuario, password: h.senha, rejectUnauthorized: false, clientId: `brim3d_${aleatorio(8, MIN + NUM)}`, reconnectPeriod: 0, connectTimeout: 8000, keepalive: 30 });
      this.client.on("connect", () => {
        this.conectado = true;
        this.client.subscribe(`anycubic/anycubicCloud/v1/printer/public/${h.modelId}/${h.deviceId}/+/report`);
        this.consultar();
        this.timer = setInterval(() => this.consultar(), 15000);
      });
      this.client.on("message", (topico, buf) => this.receber(topico, buf));
      this.client.on("close", () => { this.conectado = false; clearInterval(this.timer); this.recomecar(); });
      this.client.on("error", (e) => { this.erro = e.message; });
    } catch (e) {
      this.erro = e.message || String(e);
      this.recomecar();
    }
  }
  recomecar() { try { this.client?.end(true); } catch { /* ok */ } if (!this.fechado && !this.agendado) { this.agendado = true; setTimeout(() => { this.agendado = false; this.tentar(); }, 15000); } }
  consultar() {
    if (!this.h || !this.conectado) return;
    for (const tipo of ["info", "tempature", "print"]) {
      try { this.client.publish(`anycubic/anycubicCloud/v1/web/printer/${this.h.modelId}/${this.h.deviceId}/${tipo}`, JSON.stringify({ type: tipo, action: "query", timestamp: Date.now(), msgid: crypto.randomUUID(), data: null })); } catch { /* ok */ }
    }
  }
  receber(topico, buf) {
    try {
      const partes = topico.split("/"); const tipo = partes[partes.length - 2];
      const d = JSON.parse(buf.toString()).data;
      if (!d || typeof d !== "object") return;
      const e = this.estado;
      if (tipo === "info") { Object.assign(e, d); this.recebeu = true; }
      else if (tipo === "tempature") { e.temp = { ...(e.temp || {}), ...d.temp, ...d }; this.recebeu = true; }
      else if (tipo === "print" && d.progress !== undefined) { e.project = { ...(e.project || {}), ...d }; }
    } catch { /* ignora */ }
  }
  fechar() { this.fechado = true; clearInterval(this.timer); try { this.client?.end(true); } catch { /* ok */ } }
}

const conexoes = new Map();
export function garantirAnycubic({ ip, log }) { if (!conexoes.has(ip)) conexoes.set(ip, new Conexao(ip, log)); }
export function pararAnycubicQueSobrou(ips) { for (const [ip, c] of conexoes) if (!ips.has(ip)) { c.fechar(); conexoes.delete(ip); } }

export function traduzirAnycubic(e) {
  const pr = e.project || {}, st = String(pr.state || ""), pausa = Number(pr.pause || 0);
  if ([1, 2].includes(pausa) || st === "paused" || st === "pausing") return "pausado";
  if (["printing", "preheating", "auto_leveling", "vibrating", "flow_calibrating", "resuming", "resumed"].includes(st)) return "imprimindo";
  if (e.state === "busy" && st && !["stopping", "stoped", "finished"].includes(st)) return "imprimindo";
  if (e.last_project?.state === "finished" && e.state !== "busy") return "concluido";
  return "parado";
}

export function lerAnycubic(ip) {
  const c = conexoes.get(ip);
  if (!c) return null;
  if (!c.conectado || !c.recebeu) return { status: "offline", erro: c.erro || "conectando…" };
  const e = c.estado, status = traduzirAnycubic(e), pr = status === "concluido" ? (e.last_project || {}) : (e.project || {}), t = e.temp || {};
  const velocidade = { 1: 50, 2: 100, 3: 150 }[e.print_speed_mode] || 100;
  return {
    status,
    progress_pct: status === "concluido" ? 100 : Math.round(Number(pr.progress || 0)),
    nozzle_temp: Number(t.curr_nozzle_temp || 0), nozzle_target_temp: Number(t.target_nozzle_temp || 0),
    bed_temp: Number(t.curr_hotbed_temp || 0), bed_target_temp: Number(t.target_hotbed_temp || 0),
    remaining_time_min: status === "imprimindo" ? Math.round(Number(pr.remain_time || 0)) : 0,
    current_file: pr.filename || "",
    layer_current: Number(pr.curr_layer || 0), layer_total: Number(pr.total_layers || 0),
    speed_pct: velocidade, ams_trays: [], hms_alert: false, wifi_signal: "",
  };
}
