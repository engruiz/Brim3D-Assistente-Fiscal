// Monitor da Farm do Brim3D Desktop: pareia com a conta, lê as impressoras e envia o status ao sistema.
import { lerMonitor, obterAcesso, temAcesso } from "./store.js";
import { consultarMoonraker } from "./moonraker.js";
import { garantirBambu, pararBambuQueSobrou, lerBambu } from "./bambu.js";
import { garantirElegoo, pararElegooQueSobrou, lerElegoo } from "./elegoo.js";
import { garantirAnycubic, pararAnycubicQueSobrou, lerAnycubic } from "./anycubic.js";
import { consultarOctoPrint } from "./octoprint.js";
import { consultarPrusaLink } from "./prusalink.js";
import { descobrirBambu, descobrirElegoo, descobrirElegooPorPorta, descobrirBambuPorPorta, descobrirMoonraker, descobrirAnycubic } from "./discover.js";

const INTERVALO_ATIVO = Number(process.env.MONITOR_INTERVALO_MS || 15000);
const INTERVALO_OCIOSO = Number(process.env.MONITOR_INTERVALO_OCIOSO_MS || 45000);
const TIPOS_BAMBU = ["bambu_lan", "bambu_nuvem"];
const offlineDesde = new Map(); // id da impressora -> quando ficou offline (para procurar o IP novo)
let proximaBuscaRapida = 0;

// Credencial local (código de acesso / chave de API) que cada tipo precisa. Fica só neste computador.
export function credencialDe(p) {
  if (TIPOS_BAMBU.includes(p.conexao_tipo)) return { rotulo: "Código de acesso da impressora", chave: p.conexao_serial || "" };
  if (p.conexao_tipo === "octoprint") return { rotulo: "Chave de API do OctoPrint", chave: `id:${p.id}` };
  if (p.conexao_tipo === "prusalink") return { rotulo: "Chave de API do PrusaLink", chave: `id:${p.id}` };
  return null;
}

const estado = { pareado: false, plano: null, email: null, impressoras: [], ultimoEnvio: null, erro: "", descobertas: 0, procurando: false, ultimaBusca: null };
let log = () => {};
let impressorasSite = [];
let proximaConsultaSite = 0;
let proximaBusca = 0;
let rodando = false;
let timer = null;

async function chamar(nome, corpo) {
  const m = lerMonitor();
  const r = await fetch(`${m.apiBase}/functions/${nome}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: m.codigo, ...corpo }), signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) throw new Error(j.erro || j.error || `HTTP ${r.status}`);
  return j;
}

async function consultarSite(forcar = false) {
  if (!forcar && Date.now() < proximaConsultaSite) return;
  const j = await chamar("desktopPareamento", { acao: "status" });
  estado.pareado = true; estado.plano = j.plano; estado.email = j.email; impressorasSite = j.impressoras || [];
  proximaConsultaSite = Date.now() + 60000;
}

async function lerImpressora(p) {
  const base = { id: p.id, name: p.name, tipo: p.conexao_tipo, ip: p.conexao_ip || "", serial: p.conexao_serial || "" };
  try {
    if (p.conexao_tipo === "moonraker") {
      if (!base.ip) return { ...base, erro: "Falta o IP" };
      return { ...base, ...(await consultarMoonraker(base.ip)) };
    }
    if (TIPOS_BAMBU.includes(p.conexao_tipo)) {
      if (!base.serial) return { ...base, status: "offline", erro: "Falta o número de série" };
      if (!base.ip) return { ...base, status: "offline", erro: p.conexao_tipo === "bambu_nuvem" ? "Modo nuvem sem IP: use o IP da impressora na rede para ler pelo computador" : "Falta o IP" };
      const codigo = obterAcesso(base.serial);
      if (!codigo) return { ...base, status: "offline", erro: "Falta o código de acesso (informe na janela do programa)", precisaCodigo: true };
      garantirBambu({ serial: base.serial, ip: base.ip, codigo, log });
      const s = lerBambu(base.serial);
      return { ...base, ...(s || { status: "offline", erro: "conectando…" }) };
    }
    if (p.conexao_tipo === "elegoo_sdcp") {
      if (!base.ip) return { ...base, status: "offline", erro: "Falta o IP" };
      garantirElegoo({ ip: base.ip, log });
      return { ...base, ...(lerElegoo(base.ip) || { status: "offline", erro: "conectando…" }) };
    }
    if (p.conexao_tipo === "anycubic_lan") {
      if (!base.ip) return { ...base, status: "offline", erro: "Falta o IP" };
      garantirAnycubic({ ip: base.ip, log });
      return { ...base, ...(lerAnycubic(base.ip) || { status: "offline", erro: "conectando…" }) };
    }
    if (p.conexao_tipo === "octoprint" || p.conexao_tipo === "prusalink") {
      if (!base.ip) return { ...base, status: "offline", erro: "Falta o IP" };
      const cred = credencialDe(p);
      const chave = obterAcesso(cred.chave);
      if (!chave) return { ...base, status: "offline", erro: `Falta a ${cred.rotulo.toLowerCase()} (informe na janela do programa)`, precisaCodigo: true };
      try {
        const leitor = p.conexao_tipo === "octoprint" ? consultarOctoPrint : consultarPrusaLink;
        return { ...base, ...(await leitor(base.ip, chave)) };
      } catch (e) { return { ...base, status: "offline", erro: e.message || String(e), precisaCodigo: !!e.credencial }; }
    }
    return { ...base, status: "offline", erro: "Este tipo de conexão ainda não é suportado nesta versão" };
  } catch (e) {
    return { ...base, status: "offline", erro: e.message || String(e) };
  }
}

async function enviar(lidas) {
  const printers = lidas.map((l) => ({
    name: l.name, serial: l.serial, ip: l.ip, status: l.status || "offline",
    progress_pct: l.progress_pct, nozzle_temp: l.nozzle_temp, nozzle_target_temp: l.nozzle_target_temp, bed_temp: l.bed_temp, bed_target_temp: l.bed_target_temp,
    remaining_time_min: l.remaining_time_min, current_file: l.current_file, layer_current: l.layer_current, layer_total: l.layer_total, speed_pct: l.speed_pct,
    ams_trays: l.ams_trays, hms_alert: l.hms_alert, wifi_signal: l.wifi_signal,
  }));
  if (printers.length) await chamar("monitorIngest", { printers });
  estado.ultimoEnvio = new Date().toISOString();
}

// Se uma impressora já cadastrada (reconhecida pelo serial/ID) apareceu com outro IP, atualiza o cadastro no sistema.
async function seguirIps(todas) {
  const mudancas = [];
  for (const d of todas) {
    if (!d.serial || !d.ip) continue;
    const p = impressorasSite.find((x) => x.conexao_serial && String(x.conexao_serial).toLowerCase() === String(d.serial).toLowerCase());
    if (p && p.conexao_ip !== d.ip) { mudancas.push({ serial: d.serial, ip: d.ip }); log(`IP de "${p.name}" mudou: ${p.conexao_ip} -> ${d.ip}`); p.conexao_ip = d.ip; }
  }
  if (mudancas.length) await chamar("desktopPareamento", { acao: "atualizar_ip", impressoras: mudancas });
}

export async function procurarImpressoras() {
  if (estado.procurando) return;
  estado.procurando = true;
  try {
    const [b, bp, m, el, elp, ac] = await Promise.all([descobrirBambu().catch(() => []), descobrirBambuPorPorta().catch(() => []), descobrirMoonraker().catch(() => []), descobrirElegoo().catch(() => []), descobrirElegooPorPorta().catch(() => []), descobrirAnycubic().catch(() => [])]);
    const porChave = new Map();
    for (const d of [...bp, ...elp, ...ac, ...b, ...m, ...el]) porChave.set(d.chave, { ...(porChave.get(d.chave) || {}), ...d }); // SSDP (b) tem nome/modelo melhores
    const todas = [...porChave.values()];
    estado.descobertas = todas.length; estado.ultimaBusca = new Date().toISOString();
    if (todas.length) await chamar("desktopPareamento", { acao: "descobertas", impressoras: todas });
    await seguirIps(todas);
    log(`Busca na rede: ${todas.length} impressora(s).`);
  } catch (e) { estado.erro = e.message; log(`Busca falhou: ${e.message}`); }
  finally { estado.procurando = false; }
}

async function ciclo() {
  let espera = INTERVALO_OCIOSO;
  try {
    if (!lerMonitor().codigo) { estado.pareado = false; estado.erro = ""; return; }
    await consultarSite();
    estado.erro = "";
    if (!estado.plano?.monitor) { pararBambuQueSobrou(new Set()); pararElegooQueSobrou(new Set()); pararAnycubicQueSobrou(new Set()); estado.impressoras = []; return; }
    if (Date.now() >= proximaBusca) { proximaBusca = Date.now() + 10 * 60000; procurarImpressoras(); }
    const monitoradas = impressorasSite.filter((p) => p.conexao_tipo);
    pararBambuQueSobrou(new Set(monitoradas.filter((p) => TIPOS_BAMBU.includes(p.conexao_tipo)).map((p) => p.conexao_serial)));
    pararElegooQueSobrou(new Set(monitoradas.filter((p) => p.conexao_tipo === "elegoo_sdcp").map((p) => p.conexao_ip)));
    pararAnycubicQueSobrou(new Set(monitoradas.filter((p) => p.conexao_tipo === "anycubic_lan").map((p) => p.conexao_ip)));
    const lidas = await Promise.all(monitoradas.map(lerImpressora));
    // Offline há mais de 90 s e reconhecível por serial/ID: procura na rede (no máx. a cada 3 min) caso o IP tenha mudado.
    for (const l of lidas) {
      if (l.status === "offline" && l.serial) { if (!offlineDesde.has(l.id)) offlineDesde.set(l.id, Date.now()); }
      else offlineDesde.delete(l.id);
    }
    if (Date.now() >= proximaBuscaRapida && [...offlineDesde.values()].some((t) => Date.now() - t > 90000)) { proximaBuscaRapida = Date.now() + 3 * 60000; procurarImpressoras(); }
    estado.impressoras = lidas.map((l) => ({ id: l.id, nome: l.name, tipo: l.tipo, ip: l.ip, serial: l.serial, status: l.status || "offline", progresso: l.progress_pct ?? 0, erro: l.erro || "", precisaCodigo: !!l.precisaCodigo, cred: credencialDe(impressorasSite.find((x) => x.id === l.id) || {}) }));
    await enviar(lidas);
    if (lidas.some((l) => ["imprimindo", "pausado"].includes(l.status))) espera = INTERVALO_ATIVO;
  } catch (e) {
    estado.erro = e.message || String(e);
    if (/inválido/i.test(estado.erro)) estado.pareado = false;
    log(`Monitor: ${estado.erro}`);
  } finally {
    if (rodando) timer = setTimeout(ciclo, espera);
  }
}

export function iniciarMonitor(fnLog) {
  if (rodando) return;
  log = fnLog || log; rodando = true;
  timer = setTimeout(ciclo, 2000);
}
export function pararMonitor() { rodando = false; clearTimeout(timer); pararBambuQueSobrou(new Set()); }

// Chamado quando o usuário cola o código ou informa um código de acesso: refaz tudo já.
export function atualizarAgora() { proximaConsultaSite = 0; proximaBusca = 0; clearTimeout(timer); if (rodando) timer = setTimeout(ciclo, 200); }

export function statusMonitor() {
  const m = lerMonitor();
  return { ...estado, temCodigo: !!m.codigo, impressoras: estado.impressoras.map((i) => ({ ...i, temAcesso: i.cred?.chave ? temAcesso(i.cred.chave) : false })) };
}
