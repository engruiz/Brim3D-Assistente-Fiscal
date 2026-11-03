// Configuração local do Monitor: código de pareamento + códigos de acesso das impressoras.
// Os códigos de acesso (Bambu LAN etc.) ficam SÓ neste computador, cifrados com a chave da máquina.
import fs from "node:fs";
import path from "node:path";
import { pastaDados, lerConfig, cifrarSenha, decifrarSenha } from "../config.js";

export const API_BASE_PADRAO = "https://gerenciadordefarm3d.base44.app";
const arquivo = () => { fs.mkdirSync(pastaDados(), { recursive: true }); return path.join(pastaDados(), "monitor.json"); };

export function lerMonitor() {
  let c = {};
  try { c = JSON.parse(fs.readFileSync(arquivo(), "utf8")); } catch { /* primeira vez */ }
  return { codigo: "", apiBase: API_BASE_PADRAO, acessos: {}, ...c, acessos: { ...(c.acessos || {}) } };
}

export function salvarMonitor(m) {
  fs.writeFileSync(arquivo(), JSON.stringify(m, null, 2), { mode: 0o600 });
}

export function definirCodigo(codigo) {
  const m = lerMonitor();
  m.codigo = String(codigo || "").trim();
  salvarMonitor(m);
}

export function definirAcesso(chave, codigoAcesso) {
  const m = lerMonitor();
  const k = String(chave || "").trim().toLowerCase();
  if (!k) return;
  if (!codigoAcesso) delete m.acessos[k];
  else m.acessos[k] = cifrarSenha(lerConfig(), String(codigoAcesso).trim());
  salvarMonitor(m);
}

export function obterAcesso(chave) {
  const m = lerMonitor();
  const v = m.acessos[String(chave || "").trim().toLowerCase()];
  return v ? decifrarSenha(lerConfig(), v) : null;
}

export const temAcesso = (chave) => !!lerMonitor().acessos[String(chave || "").trim().toLowerCase()];
