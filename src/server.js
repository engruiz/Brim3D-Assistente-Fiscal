// Assistente Fiscal do Brim3D — servidor local (127.0.0.1) que guarda o certificado A1,
// assina e transmite a NF-e para a SEFAZ-SP. O sistema (Base44) conversa com ele pelo navegador.
import http from "node:http";
import fs from "node:fs";
import { exec } from "node:child_process";
import { abrirPfx, CertError } from "./cert.js";
import { montarNfe, validarPayload } from "./xml.js";
import { autorizarNfe, consultarChave, cancelarNfe, cartaCorrecao, inutilizarNumeros, statusServico, SefazError } from "./sefaz.js";
import { lerConfig, salvarConfig, arquivoPfx, cifrarSenha, decifrarSenha, guardarNota, log, lerCa, pastaDados } from "./config.js";
import { paginaInicial, VERSAO } from "./page.js";
import { onlyDigits } from "./util.js";

const PORTA = Number(process.env.FISCAL_PORT || 3777);
let cert = null; // certificado aberto em memória

function carregarCertSalvo() {
  const cfg = lerConfig();
  if (!fs.existsSync(arquivoPfx())) return;
  if (!cfg.senhaCifrada) return;
  const senha = decifrarSenha(cfg, cfg.senhaCifrada);
  if (!senha) return;
  try { cert = abrirPfx(fs.readFileSync(arquivoPfx()), senha); log(`Certificado carregado (${cert.cnpj}).`); } catch (e) { log(`Falha ao abrir certificado salvo: ${e.message}`); }
}

const infoCert = () => {
  const salvo = fs.existsSync(arquivoPfx());
  if (!cert) return { carregado: false, salvo };
  return { carregado: true, salvo: true, cnpj: cert.cnpj, nome: cert.nome, validade: cert.validade, diasParaVencer: cert.diasParaVencer, vencido: cert.vencido };
};

function origemPermitida(origin, cfg) {
  if (!origin) return false;
  if (cfg.origens.includes(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function lerCorpo(req, limite = 8_000_000) {
  return new Promise((resolve, reject) => {
    let n = 0; const partes = [];
    req.on("data", (c) => { n += c.length; if (n > limite) { reject(new Error("Corpo muito grande")); req.destroy(); } else partes.push(c); });
    req.on("end", () => { try { resolve(partes.length ? JSON.parse(Buffer.concat(partes).toString("utf8")) : {}); } catch { reject(new Error("JSON inválido")); } });
  });
}

function responder(res, status, obj, cors = {}) {
  const corpo = typeof obj === "string" ? obj : JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": typeof obj === "string" ? "text/html; charset=utf-8" : "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors });
  res.end(corpo);
}

const erroDe = (e) => (e instanceof SefazError || e instanceof CertError ? e.message : `Erro interno: ${e?.message || e}`);

function exigirCert(ambiente, cfg, cnpjEmpresa) {
  if (!cert) throw new CertError("O certificado digital ainda não foi carregado no Assistente. Abra o Assistente e informe o certificado e a senha.");
  if (cert.vencido) throw new CertError("O certificado digital está vencido.");
  if (ambiente === "producao" && !cfg.producaoLiberada) throw new CertError("A emissão em produção ainda não foi liberada no Assistente (por segurança). Libere na janela do Assistente quando estiver pronto.");
  if (cnpjEmpresa && cert.cnpj && onlyDigits(cnpjEmpresa) !== cert.cnpj) throw new CertError(`O certificado carregado é do CNPJ ${cert.cnpj}, diferente do CNPJ da empresa (${onlyDigits(cnpjEmpresa)}).`);
}

export function criarServidor() {
  return http.createServer(async (req, res) => {
    const cfg = lerConfig();
    const origin = req.headers.origin;
    const cors = origemPermitida(origin, cfg)
      ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "content-type, x-fiscal-token", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Private-Network": "true", "Access-Control-Max-Age": "600", Vary: "Origin" }
      : {};
    // proteção contra DNS rebinding: só aceita Host local
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || "")) return responder(res, 403, { ok: false, erro: "Host não permitido." });
    if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
    if (origin && !cors["Access-Control-Allow-Origin"]) return responder(res, 403, { ok: false, erro: "Este site não tem permissão para usar o Assistente Fiscal." });

    const url = new URL(req.url, "http://localhost");
    try {
      if (req.method === "GET" && url.pathname === "/") return responder(res, 200, paginaInicial(cfg.token), cors);
      // Estado básico (sem código): só informa que o Assistente está aberto
      if (req.method === "GET" && url.pathname === "/ping") return responder(res, 200, { ok: true, app: "assistente-fiscal-fm3d", versao: VERSAO, certificado: { carregado: !!cert }, precisaCodigo: true }, cors);

      // Tudo abaixo exige o código de conexão
      if (req.headers["x-fiscal-token"] !== cfg.token) return responder(res, 401, { ok: false, erro: "Código de conexão inválido. Copie o código mostrado na janela do Assistente Fiscal." }, cors);

      if (req.method === "GET" && url.pathname === "/status") return responder(res, 200, { ok: true, versao: VERSAO, certificado: infoCert(), producaoLiberada: cfg.producaoLiberada, pasta: pastaDados() }, cors);
      if (req.method !== "POST") return responder(res, 404, { ok: false, erro: "Rota não encontrada." }, cors);
      const b = await lerCorpo(req);

      if (url.pathname === "/config") {
        if (typeof b.producaoLiberada === "boolean") cfg.producaoLiberada = b.producaoLiberada;
        if (Array.isArray(b.origens)) cfg.origens = b.origens.filter((o) => /^https:\/\/[\w.-]+$/.test(o));
        salvarConfig(cfg);
        return responder(res, 200, { ok: true }, cors);
      }

      if (url.pathname === "/certificado") {
        let buf;
        if (b.pfxBase64) buf = Buffer.from(b.pfxBase64, "base64");
        else if (fs.existsSync(arquivoPfx())) buf = fs.readFileSync(arquivoPfx());
        else throw new CertError("Escolha o arquivo do certificado (.pfx).");
        const aberto = abrirPfx(buf, b.senha); // lança erro se a senha estiver errada
        if (aberto.vencido) throw new CertError("Esse certificado está vencido.");
        if (b.pfxBase64) fs.writeFileSync(arquivoPfx(), buf, { mode: 0o600 });
        cfg.senhaCifrada = b.lembrar ? cifrarSenha(cfg, b.senha) : "";
        salvarConfig(cfg);
        cert = aberto;
        log(`Certificado carregado (${cert.cnpj}), vence em ${cert.validade.slice(0, 10)}.`);
        return responder(res, 200, { ok: true, certificado: infoCert() }, cors);
      }
      if (url.pathname === "/certificado/remover") {
        try { fs.unlinkSync(arquivoPfx()); } catch { /* já não existe */ }
        cfg.senhaCifrada = ""; salvarConfig(cfg); cert = null;
        return responder(res, 200, { ok: true }, cors);
      }

      if (url.pathname === "/sefaz/status") {
        exigirCert("homologacao", cfg);
        if (b.ambiente === "producao" && !cert) throw new CertError("Carregue o certificado primeiro.");
        const r = await statusServico(cert, b.ambiente === "producao" ? "producao" : "homologacao", { ca: lerCa() });
        return responder(res, 200, { ok: true, ...r }, cors);
      }

      if (url.pathname === "/nfe/emitir") {
        const ambiente = b.ambiente === "producao" ? "producao" : "homologacao";
        const problemas = validarPayload(b);
        if (problemas.length) return responder(res, 422, { ok: false, erro: "Corrija antes de emitir:\n• " + problemas.join("\n• "), problemas }, cors);
        exigirCert(ambiente, cfg, b.empresa?.cnpj);
        const n = montarNfe({ ...b, ambiente });
        log(`Emitindo NF-e ${b.numero} (${ambiente}) chave ${n.chave}`);
        const r = await autorizarNfe(cert, ambiente, { xml: n.xml, chave: n.chave }, { ca: lerCa() });
        log(`NF-e ${b.numero}: ${r.status} ${r.cStat} ${r.xMotivo}`);
        if (r.xmlProc) guardarNota(ambiente, n.chave, "nfeProc", r.xmlProc);
        else guardarNota(ambiente, n.chave, `rejeitada-${r.cStat || "x"}`, r.xmlAssinado);
        return responder(res, 200, { ok: true, ...r, numero: Number(b.numero), serie: Number(b.serie || 1), total: n.totais.vNF, dh: n.dh }, cors);
      }

      if (url.pathname === "/nfe/consultar") {
        const ambiente = b.ambiente === "producao" ? "producao" : "homologacao";
        exigirCert(ambiente, cfg);
        const r = await consultarChave(cert, ambiente, b.chave, { ca: lerCa() });
        return responder(res, 200, { ok: true, ...r }, cors);
      }

      if (url.pathname === "/nfe/cancelar") {
        const ambiente = b.ambiente === "producao" ? "producao" : "homologacao";
        exigirCert(ambiente, cfg, b.cnpj);
        const r = await cancelarNfe(cert, ambiente, { chave: b.chave, cnpj: b.cnpj || cert.cnpj, protocolo: b.protocolo, justificativa: b.justificativa }, { ca: lerCa() });
        log(`Cancelamento ${b.chave}: ${r.cStat} ${r.xMotivo}`);
        if (r.ok) guardarNota(ambiente, b.chave, "cancelamento", r.xmlEvento);
        return responder(res, 200, { ok: true, ...r }, cors);
      }

      if (url.pathname === "/nfe/cce") {
        const ambiente = b.ambiente === "producao" ? "producao" : "homologacao";
        exigirCert(ambiente, cfg, b.cnpj);
        const r = await cartaCorrecao(cert, ambiente, { chave: b.chave, cnpj: b.cnpj || cert.cnpj, texto: b.texto, seq: Number(b.seq || 1) }, { ca: lerCa() });
        if (r.ok) guardarNota(ambiente, b.chave, `cce-${b.seq || 1}`, r.xmlEvento);
        return responder(res, 200, { ok: true, ...r }, cors);
      }

      if (url.pathname === "/nfe/inutilizar") {
        const ambiente = b.ambiente === "producao" ? "producao" : "homologacao";
        exigirCert(ambiente, cfg, b.cnpj);
        const r = await inutilizarNumeros(cert, ambiente, { cnpj: b.cnpj || cert.cnpj, serie: b.serie || 1, nIni: b.nIni, nFin: b.nFin || b.nIni, justificativa: b.justificativa }, { ca: lerCa() });
        return responder(res, 200, { ok: true, ...r }, cors);
      }

      return responder(res, 404, { ok: false, erro: "Rota não encontrada." }, cors);
    } catch (e) {
      log(`Erro em ${url.pathname}: ${e?.message || e}`);
      return responder(res, e instanceof CertError ? 400 : 502, { ok: false, erro: erroDe(e), incerto: !!e?.incerto }, cors);
    }
  });
}

function abrirNavegador(url) {
  const cmd = process.platform === "win32" ? `start "" "${url}"` : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

const executadoDiretamente = !process.env.FISCAL_NO_AUTOSTART;
if (executadoDiretamente) {
  carregarCertSalvo();
  const srv = criarServidor();
  srv.on("error", (e) => {
    if (e.code === "EADDRINUSE") { console.log(`\nO Assistente Fiscal já está aberto (porta ${PORTA}). Pode fechar esta janela.\n`); abrirNavegador(`http://localhost:${PORTA}`); setTimeout(() => process.exit(0), 3000); }
    else { console.error(e); }
  });
  srv.listen(PORTA, "127.0.0.1", () => {
    console.log("\n==============================================");
    console.log("  ASSISTENTE FISCAL · Brim3D  v" + VERSAO);
    console.log("==============================================");
    console.log(`  Rodando em http://localhost:${PORTA}`);
    console.log("  Deixe esta janela ABERTA para emitir notas.");
    console.log("  Para sair, feche esta janela.\n");
    if (!process.env.FISCAL_NO_BROWSER) abrirNavegador(`http://localhost:${PORTA}`);
  });
}
