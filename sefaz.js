// Comunicação com a SEFAZ de qualquer UF (NF-e 4.00): SOAP 1.2 sobre HTTPS com o certificado A1 do emitente.
import https from "node:https";
import { XMLParser } from "fast-xml-parser";
import { assinar } from "./sign.js";
import { onlyDigits, dhBrasilia, UF_CODE, ufDaChave } from "./util.js";
import { wsDe } from "./ufs.js";

const NS = "http://www.portalfiscal.inf.br/nfe";

// serviço -> { path (só para testes locais), wsdl (namespace) }. A URL real e o método SOAP vêm de ufs.js, por UF.
const SERVICOS = {
  status: { path: "nfestatusservico4.asmx", wsdl: "NFeStatusServico4" },
  autorizacao: { path: "nfeautorizacao4.asmx", wsdl: "NFeAutorizacao4" },
  retAutorizacao: { path: "nferetautorizacao4.asmx", wsdl: "NFeRetAutorizacao4" },
  consulta: { path: "nfeconsultaprotocolo4.asmx", wsdl: "NFeConsultaProtocolo4" },
  inutilizacao: { path: "nfeinutilizacao4.asmx", wsdl: "NFeInutilizacao4" },
  evento: { path: "nferecepcaoevento4.asmx", wsdl: "NFeRecepcaoEvento4" },
};

export class SefazError extends Error {
  constructor(msg, extra = {}) { super(msg); Object.assign(this, extra); }
}

const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false, parseAttributeValue: false });
export const parse = (xml) => parser.parse(xml);

/** Endereço e método SOAP do serviço para a UF do emitente. */
export function urlServico(servico, ambiente, uf) {
  const s = SERVICOS[servico];
  if (process.env.FISCAL_SEFAZ_BASE) return { url: `${process.env.FISCAL_SEFAZ_BASE}/ws/${s.path}`, metodo: wsDe("SP", ambiente, servico).metodo }; // só para testes
  return wsDe(uf, ambiente, servico);
}

const agentes = new WeakMap();
function agenteDe(cert, ca) {
  let a = agentes.get(cert);
  if (!a) {
    a = new https.Agent({
      key: cert.keyPem,
      cert: cert.certPem + (cert.chainPem || ""),
      ...(ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false }), // sem a cadeia ICP-Brasil instalada, não valida o servidor
      keepAlive: false,
      minVersion: "TLSv1.2",
    });
    agentes.set(cert, a);
  }
  return a;
}

/** Envia uma mensagem SOAP e devolve o XML de dentro de <nfeResultMsg>. */
export function soap(servico, mensagemXml, cert, { ambiente, uf, timeoutMs = 45000, ca, urlOverride } = {}) {
  const s = SERVICOS[servico];
  const wsdlNs = `http://www.portalfiscal.inf.br/nfe/wsdl/${s.wsdl}`;
  const envelope =
    `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="${wsdlNs}">${mensagemXml}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;
  const alvo = urlOverride ? { url: urlOverride, metodo: urlServico(servico, ambiente, uf || "SP").metodo } : urlServico(servico, ambiente, uf);
  const url = new URL(alvo.url);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: "POST", hostname: url.hostname, port: url.port || 443, path: url.pathname,
        agent: agenteDe(cert, ca),
        headers: {
          "Content-Type": `application/soap+xml; charset=utf-8; action="${wsdlNs}/${alvo.metodo}"`,
          "Content-Length": Buffer.byteLength(envelope),
        },
        timeout: timeoutMs,
      },
      (res) => {
        const partes = [];
        res.on("data", (c) => partes.push(c));
        res.on("end", () => {
          const corpo = Buffer.concat(partes).toString("utf8");
          if (res.statusCode !== 200) return reject(new SefazError(`A SEFAZ respondeu com erro HTTP ${res.statusCode}.`, { http: res.statusCode, corpo: corpo.slice(0, 500) }));
          const m = corpo.match(/<(?:\w+:)?nfeResultMsg[^>]*>([\s\S]*?)<\/(?:\w+:)?nfeResultMsg>/);
          if (!m) {
            const f = corpo.match(/<(?:\w+:)?Text[^>]*>([\s\S]*?)<\//);
            return reject(new SefazError(`Resposta inesperada da SEFAZ${f ? `: ${f[1]}` : "."}`, { corpo: corpo.slice(0, 500) }));
          }
          resolve(m[1]);
        });
      }
    );
    req.on("timeout", () => req.destroy(new SefazError("A SEFAZ demorou demais para responder (tempo esgotado).", { timeout: true })));
    req.on("error", (e) => reject(e instanceof SefazError ? e : new SefazError(traduzirErroRede(e), { causa: e.code })));
    req.write(envelope);
    req.end();
  });
}

function traduzirErroRede(e) {
  const c = e.code || "";
  if (["ENOTFOUND", "EAI_AGAIN"].includes(c)) return "Sem internet (não encontrei o servidor da SEFAZ).";
  if (["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EHOSTUNREACH"].includes(c)) return "Não consegui conectar na SEFAZ agora. Tente de novo em instantes.";
  if (/certificate|handshake|alert/i.test(e.message || "")) return `Falha na conexão segura com a SEFAZ (certificado): ${e.message}`;
  return `Erro de conexão com a SEFAZ: ${e.message}`;
}

const tpAmb = (amb) => (amb === "producao" ? "1" : "2");
const pega = (obj, ...caminho) => caminho.reduce((o, k) => (o == null ? o : o[k]), obj);
const lista = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

/** Consulta o status do serviço de autorização (cStat 107 = em operação). */
export async function statusServico(cert, ambiente, opts = {}) {
  const uf = String(opts.uf || "SP").toUpperCase();
  if (!UF_CODE[uf]) throw new SefazError(`UF inválida: ${uf}.`);
  const msg = `<consStatServ xmlns="${NS}" versao="4.00"><tpAmb>${tpAmb(ambiente)}</tpAmb><cUF>${UF_CODE[uf]}</cUF><xServ>STATUS</xServ></consStatServ>`;
  const r = parse(await soap("status", msg, cert, { ambiente, ...opts })).retConsStatServ || {};
  return { cStat: r.cStat, xMotivo: r.xMotivo, online: r.cStat === "107", dhRecbto: r.dhRecbto, tMed: r.tMed };
}

function extrair(xml, tagNome) {
  const m = xml.match(new RegExp(`<${tagNome}[\\s>][\\s\\S]*?</${tagNome}>`));
  return m ? m[0] : "";
}

export function montarNfeProc(nfeAssinada, protNFeXml) {
  return `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="${NS}" versao="4.00">${nfeAssinada}${protNFeXml}</nfeProc>`;
}

function resultadoProt(protXml) {
  const p = parse(protXml).protNFe?.infProt || {};
  const cStat = String(p.cStat || "");
  return {
    cStat, xMotivo: p.xMotivo || "", protocolo: p.nProt || "", dhRecbto: p.dhRecbto || "", digVal: p.digVal || "",
    autorizada: cStat === "100" || cStat === "150",
    denegada: ["110", "301", "302", "303"].includes(cStat),
  };
}

/** Consulta a situação de uma nota pela chave de acesso. */
export async function consultarChave(cert, ambiente, chave, opts = {}) {
  const msg = `<consSitNFe xmlns="${NS}" versao="4.00"><tpAmb>${tpAmb(ambiente)}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${onlyDigits(chave)}</chNFe></consSitNFe>`;
  const xml = await soap("consulta", msg, cert, { ambiente, uf: ufDaChave(chave), ...opts });
  const r = parse(xml).retConsSitNFe || {};
  const protXml = extrair(xml, "protNFe");
  const eventos = lista(pega(parse(xml), "retConsSitNFe", "procEventoNFe")).map((e) => ({
    tpEvento: pega(e, "evento", "infEvento", "tpEvento"), cStat: pega(e, "retEvento", "infEvento", "cStat"), nProt: pega(e, "retEvento", "infEvento", "nProt"),
  }));
  const cStat = String(r.cStat || "");
  const prot = protXml ? resultadoProt(protXml) : null;
  return {
    cStat, xMotivo: r.xMotivo || "", protNFeXml: protXml, prot, eventos,
    // 100 autorizada; 101 cancelada; 110 denegada
    situacao: cStat === "100" ? "autorizada" : cStat === "101" || cStat === "151" ? "cancelada" : cStat === "110" ? "denegada" : cStat === "217" ? "inexistente" : "outra",
  };
}

/**
 * Envia a NF-e já montada (XML sem assinatura). Assina, transmite em modo síncrono e,
 * se necessário, consulta o recibo. Devolve { status, cStat, xMotivo, protocolo, xmlAssinado, xmlProc }.
 */
export async function autorizarNfe(cert, ambiente, { xml, chave }, opts = {}) {
  opts = { uf: ufDaChave(chave), ...opts }; // a UF do emitente está nos 2 primeiros dígitos da chave
  const assinado = assinar(xml, "infNFe", cert);
  const lote = `<enviNFe xmlns="${NS}" versao="4.00"><idLote>${String(Date.now()).slice(-15)}</idLote><indSinc>1</indSinc>${assinado}</enviNFe>`;
  let retXml;
  try {
    retXml = await soap("autorizacao", lote, cert, { ambiente, ...opts });
  } catch (e) {
    // sem resposta: a nota pode ter sido recebida; o chamador deve consultar a chave antes de tentar de novo
    if (e instanceof SefazError) e.incerto = true;
    throw e;
  }
  const ret = parse(retXml).retEnviNFe || {};
  let protXml = extrair(retXml, "protNFe");
  if (!protXml && String(ret.cStat) === "103" && ret.infRec?.nRec) {
    // lote recebido (assíncrono): aguarda e consulta o recibo
    const nRec = ret.infRec.nRec;
    for (let i = 0; i < 6 && !protXml; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      const q = await soap("retAutorizacao", `<consReciNFe xmlns="${NS}" versao="4.00"><tpAmb>${tpAmb(ambiente)}</tpAmb><nRec>${nRec}</nRec></consReciNFe>`, cert, { ambiente, ...opts });
      protXml = extrair(q, "protNFe");
    }
  }
  if (!protXml) {
    return { status: "rejeitada", cStat: String(ret.cStat || ""), xMotivo: ret.xMotivo || "A SEFAZ não devolveu o protocolo.", protocolo: "", chave, xmlAssinado: assinado, xmlProc: "" };
  }
  const r = resultadoProt(protXml);
  // 204 = duplicidade: a nota já existe; recupera o protocolo existente
  if (r.cStat === "204") {
    const c = await consultarChave(cert, ambiente, chave, opts);
    if (c.prot?.autorizada) {
      return { status: "autorizada", cStat: c.prot.cStat, xMotivo: c.prot.xMotivo, protocolo: c.prot.protocolo, dhRecbto: c.prot.dhRecbto, chave, xmlAssinado: assinado, xmlProc: montarNfeProc(assinado, c.protNFeXml), recuperada: true };
    }
  }
  return {
    status: r.autorizada ? "autorizada" : r.denegada ? "denegada" : "rejeitada",
    cStat: r.cStat, xMotivo: r.xMotivo, protocolo: r.protocolo, dhRecbto: r.dhRecbto, chave,
    xmlAssinado: assinado, xmlProc: r.autorizada ? montarNfeProc(assinado, protXml) : "",
  };
}

// ---------------- eventos (cancelamento e carta de correção) ----------------
const COND_USO_CCE =
  "A Carta de Correcao e disciplinada pelo paragrafo 1o-A do art. 7o do Convenio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularizacao de erro ocorrido na emissao de documento fiscal, desde que o erro nao esteja relacionado com: I - as variaveis que determinam o valor do imposto tais como: base de calculo, aliquota, diferenca de preco, quantidade, valor da operacao ou da prestacao; II - a correcao de dados cadastrais que implique mudanca do remetente ou do destinatario; III - a data de emissao ou de saida.";

const escTxt = (s) => String(s ?? "").replace(/\s+/g, " ").trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function enviarEvento(cert, ambiente, { chave, cnpj, tpEvento, nSeq, detEvento }, opts) {
  const id = `ID${tpEvento}${chave}${String(nSeq).padStart(2, "0")}`;
  const evento =
    `<evento xmlns="${NS}" versao="1.00"><infEvento Id="${id}"><cOrgao>${onlyDigits(chave).slice(0, 2)}</cOrgao><tpAmb>${tpAmb(ambiente)}</tpAmb><CNPJ>${onlyDigits(cnpj)}</CNPJ><chNFe>${chave}</chNFe><dhEvento>${dhBrasilia()}</dhEvento><tpEvento>${tpEvento}</tpEvento><nSeqEvento>${nSeq}</nSeqEvento><verEvento>1.00</verEvento>${detEvento}</infEvento></evento>`;
  const eventoAssinado = assinar(evento, "infEvento", cert);
  const env = `<envEvento xmlns="${NS}" versao="1.00"><idLote>${String(Date.now()).slice(-15)}</idLote>${eventoAssinado}</envEvento>`;
  const xml = await soap("evento", env, cert, { ambiente, uf: ufDaChave(chave), ...opts });
  const inf = parse(xml).retEnvEvento?.retEvento?.infEvento || {};
  const cStat = String(inf.cStat || "");
  const retEventoXml = extrair(xml, "retEvento");
  return {
    cStat, xMotivo: inf.xMotivo || "", protocolo: inf.nProt || "", ok: ["135", "136", "155"].includes(cStat),
    xmlEvento: `<?xml version="1.0" encoding="UTF-8"?><procEventoNFe xmlns="${NS}" versao="1.00">${eventoAssinado}${retEventoXml}</procEventoNFe>`,
  };
}

export function cancelarNfe(cert, ambiente, { chave, cnpj, protocolo, justificativa }, opts = {}) {
  const j = escTxt(justificativa);
  if (j.length < 15) throw new SefazError("A justificativa do cancelamento precisa ter pelo menos 15 caracteres.");
  return enviarEvento(cert, ambiente, {
    chave, cnpj, tpEvento: "110111", nSeq: 1,
    detEvento: `<detEvento versao="1.00"><descEvento>Cancelamento</descEvento><nProt>${onlyDigits(protocolo)}</nProt><xJust>${j}</xJust></detEvento>`,
  }, opts);
}

export function cartaCorrecao(cert, ambiente, { chave, cnpj, texto, seq = 1 }, opts = {}) {
  const t = escTxt(texto);
  if (t.length < 15) throw new SefazError("O texto da correção precisa ter pelo menos 15 caracteres.");
  return enviarEvento(cert, ambiente, {
    chave, cnpj, tpEvento: "110110", nSeq: seq,
    detEvento: `<detEvento versao="1.00"><descEvento>Carta de Correcao</descEvento><xCorrecao>${t}</xCorrecao><xCondUso>${COND_USO_CCE}</xCondUso></detEvento>`,
  }, opts);
}

/** Inutiliza uma faixa de números (quando um número foi pulado e não será usado). */
export async function inutilizarNumeros(cert, ambiente, { cnpj, uf, serie, nIni, nFin, justificativa }, opts = {}) {
  const ufSigla = String(uf || "").toUpperCase();
  const cUF = UF_CODE[ufSigla];
  if (!cUF) throw new SefazError("Informe a UF do emitente para inutilizar números.");
  const j = escTxt(justificativa);
  if (j.length < 15) throw new SefazError("A justificativa precisa ter pelo menos 15 caracteres.");
  const ano = String(new Date().getFullYear()).slice(2);
  const id = `ID${cUF}${ano}${onlyDigits(cnpj)}55${String(Number(serie)).padStart(3, "0")}${String(Number(nIni)).padStart(9, "0")}${String(Number(nFin)).padStart(9, "0")}`;
  const inut = `<inutNFe xmlns="${NS}" versao="4.00"><infInut Id="${id}"><tpAmb>${tpAmb(ambiente)}</tpAmb><xServ>INUTILIZAR</xServ><cUF>${cUF}</cUF><ano>${ano}</ano><CNPJ>${onlyDigits(cnpj)}</CNPJ><mod>55</mod><serie>${Number(serie)}</serie><nNFIni>${Number(nIni)}</nNFIni><nNFFin>${Number(nFin)}</nNFFin><xJust>${j}</xJust></infInut></inutNFe>`;
  const xml = await soap("inutilizacao", assinar(inut, "infInut", cert), cert, { ambiente, uf: ufSigla, ...opts });
  const inf = parse(xml).retInutNFe?.infInut || {};
  return { cStat: String(inf.cStat || ""), xMotivo: inf.xMotivo || "", protocolo: inf.nProt || "", ok: String(inf.cStat) === "102" };
}
