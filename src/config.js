// Pasta de dados do Assistente (certificado, configuração, notas guardadas, logs).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

export function pastaDados() {
  if (process.env.FISCAL_DATA_DIR) return process.env.FISCAL_DATA_DIR;
  if (process.platform === "win32") return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "FiscalFM3D");
  return path.join(os.homedir(), ".fiscal-fm3d");
}

const dir = () => { const d = pastaDados(); fs.mkdirSync(d, { recursive: true }); return d; };
const arquivoConfig = () => path.join(dir(), "config.json");
export const arquivoPfx = () => path.join(dir(), "certificado.pfx");

const PADRAO = {
  token: "",
  origens: ["https://gerenciadordefarm3d.base44.app", "https://brim3d.com.br", "https://www.brim3d.com.br", "https://app.brim3d.com.br"],
  producaoLiberada: false,
  senhaCifrada: "",
  salt: "",
};

export function lerConfig() {
  let c = {};
  try { c = JSON.parse(fs.readFileSync(arquivoConfig(), "utf8")); } catch { /* primeira execução */ }
  const cfg = { ...PADRAO, ...c };
  // Endereços oficiais sempre permitidos (mesmo em instalações antigas, que guardaram só o endereço de antes).
  cfg.origens = [...new Set([...PADRAO.origens, ...(Array.isArray(c.origens) ? c.origens : [])])];
  let mudou = false;
  if (!cfg.token) { cfg.token = crypto.randomBytes(4).toString("hex").toUpperCase().replace(/(.{4})(.{4})/, "$1-$2"); mudou = true; }
  if (!cfg.salt) { cfg.salt = crypto.randomBytes(16).toString("hex"); mudou = true; }
  if (mudou) salvarConfig(cfg);
  return cfg;
}

export function salvarConfig(cfg) {
  fs.writeFileSync(arquivoConfig(), JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

// A senha "lembrada" é cifrada com uma chave ligada a este computador/usuário. Protege contra copiar a pasta
// para outro lugar; não protege contra alguém que use este mesmo usuário do Windows.
const chaveMaquina = (cfg) => crypto.scryptSync(`${os.hostname()}|${os.userInfo().username}|fm3d`, cfg.salt, 32);

export function cifrarSenha(cfg, senha) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", chaveMaquina(cfg), iv);
  const enc = Buffer.concat([c.update(String(senha), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}

export function decifrarSenha(cfg, texto) {
  try {
    const [iv, tag, enc] = texto.split(".").map((p) => Buffer.from(p, "base64"));
    const d = crypto.createDecipheriv("aes-256-gcm", chaveMaquina(cfg), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
  } catch { return null; }
}

export function guardarNota(ambiente, chave, nome, conteudo) {
  const mes = new Date().toISOString().slice(0, 7);
  const d = path.join(dir(), "notas", ambiente, mes);
  fs.mkdirSync(d, { recursive: true });
  const f = path.join(d, `${chave}-${nome}.xml`);
  fs.writeFileSync(f, conteudo);
  return f;
}

export function log(linha) {
  try {
    const d = path.join(dir(), "logs");
    fs.mkdirSync(d, { recursive: true });
    fs.appendFileSync(path.join(d, new Date().toISOString().slice(0, 10) + ".log"), `${new Date().toISOString()} ${linha}\n`);
  } catch { /* sem log */ }
}

export function lerCa() {
  try {
    const d = path.join(dir(), "ca");
    const arqs = fs.readdirSync(d).filter((f) => /\.(pem|crt|cer)$/i.test(f));
    return arqs.length ? arqs.map((f) => fs.readFileSync(path.join(d, f), "utf8")) : null;
  } catch { return null; }
}
