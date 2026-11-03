// Montagem do XML da NF-e modelo 55, layout 4.00, para emitente MEI (CRT 4).
// Sem IBS/CBS: optantes do Simples Nacional/MEI estão dispensados em 2026.
// O XML sai compacto (sem espaços entre as tags), o que facilita a assinatura.
import { r2, onlyDigits, UF_CODE, montarChave, dhBrasilia, cNFAleatorio, PAGAMENTO } from "./util.js";

const esc = (s) =>
  String(s ?? "")
    .normalize("NFC")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
const txt = (s, max) => esc(String(s ?? "").slice(0, max));
const d2 = (n) => r2(n).toFixed(2);
const d4 = (n) => (Math.round((Number(n) || 0) * 10000) / 10000).toFixed(4);
const d10 = (n) => (Number(n) || 0).toFixed(10);
const tag = (name, value) => (value === undefined || value === null || value === "" ? "" : `<${name}>${value}</${name}>`);
const T = (name, inner) => (inner ? `<${name}>${inner}</${name}>` : "");

export const HOMOLOG_NOME = "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";

/** Distribui um valor em partes proporcionais (a última recebe a sobra de arredondamento). */
function ratear(total, bases) {
  const soma = bases.reduce((s, b) => s + b, 0);
  if (!(total > 0) || !(soma > 0)) return bases.map(() => 0);
  let acum = 0;
  return bases.map((b, i) => {
    if (i === bases.length - 1) return r2(total - acum);
    const v = r2((total * b) / soma);
    acum = r2(acum + v);
    return v;
  });
}

/** Valida os dados mínimos e devolve uma lista de problemas em português. */
export function validarPayload(p) {
  const e = [];
  const emp = p.empresa || {};
  const d = p.dest || {};
  if (onlyDigits(emp.cnpj).length !== 14) e.push("CNPJ da empresa inválido.");
  if (!emp.razao) e.push("Falta a razão social da empresa.");
  if (!onlyDigits(emp.ie)) e.push("Falta a inscrição estadual da empresa.");
  if (!emp.logradouro || !emp.bairro || !emp.municipio || !onlyDigits(emp.cod_municipio) || !emp.uf || onlyDigits(emp.cep).length !== 8)
    e.push("Endereço da empresa incompleto (rua, bairro, cidade, código IBGE, UF e CEP).");
  const doc = onlyDigits(d.doc);
  if (![11, 14].includes(doc.length)) e.push("CPF/CNPJ do cliente inválido ou ausente.");
  if (!d.nome) e.push("Falta o nome do cliente.");
  if (!d.logradouro || !d.bairro || !d.municipio || String(onlyDigits(d.cod_municipio)).length !== 7 || !d.uf || onlyDigits(d.cep).length !== 8)
    e.push("Endereço do cliente incompleto (rua, bairro, cidade com código IBGE, UF e CEP).");
  if (!Array.isArray(p.itens) || p.itens.length === 0) e.push("A nota precisa de pelo menos 1 item.");
  (p.itens || []).forEach((it, i) => {
    if (!it.descricao) e.push(`Item ${i + 1}: falta a descrição.`);
    if (onlyDigits(it.ncm).length !== 8) e.push(`Item ${i + 1}: NCM precisa ter 8 dígitos.`);
    if (!(Number(it.qtd) > 0)) e.push(`Item ${i + 1}: quantidade inválida.`);
    if (!(Number(it.valor_unit) >= 0)) e.push(`Item ${i + 1}: valor unitário inválido.`);
  });
  if (!(Number(p.numero) > 0)) e.push("Número da nota inválido.");
  return e;
}

/**
 * payload: {
 *   ambiente, numero, serie, natOp, finNFe, indPres, indIntermed, dhEmi?, cNF?,
 *   empresa:{cnpj,razao,fantasia,ie,logradouro,numero,complemento,bairro,cod_municipio,municipio,uf,cep,fone},
 *   dest:{doc,nome,ie,ind_ie,email,fone,logradouro,numero,complemento,bairro,cod_municipio,municipio,uf,cep},
 *   itens:[{codigo,descricao,ncm,cfop?,unidade,qtd,valor_unit,desconto,csosn?,origem?}],
 *   frete:{valor,modalidade,transportadora?:{doc,nome,ie,endereco,municipio,uf}}, volumes:{qtd,especie,marca,pesoL,pesoB},
 *   pagamentos:[{forma,valor}], infCpl, desconto_total?
 * }
 */
export function montarNfe(p) {
  const emp = p.empresa;
  const d = p.dest;
  const tpAmb = p.ambiente === "producao" ? "1" : "2";
  const ufEmit = String(emp.uf).toUpperCase();
  const ufDest = String(d.uf).toUpperCase();
  const cUF = UF_CODE[ufEmit];
  const dh = p.dhEmi || dhBrasilia();
  const aamm = dh.slice(2, 4) + dh.slice(5, 7);
  const cNF = String(p.cNF || cNFAleatorio()).padStart(8, "0");
  const serie = String(Number(p.serie || 1));
  const nNF = String(Number(p.numero));
  const chave = montarChave({ cUF, aamm, cnpj: emp.cnpj, serie, nNF, tpEmis: "1", cNF });
  const id = `NFe${chave}`;
  const idDest = ufDest === "EX" ? "3" : ufDest === ufEmit ? "1" : "2";
  const docDest = onlyDigits(d.doc);
  const indIEDest = String(d.ind_ie || (docDest.length === 11 ? "9" : "9"));

  // ---- itens e totais ----
  const brutos = p.itens.map((it) => r2(Number(it.qtd) * Number(it.valor_unit)));
  const descontos = p.itens.map((it) => r2(it.desconto || 0));
  const freteTotal = r2(p.frete?.valor || 0);
  const fretes = ratear(freteTotal, brutos.map((v, i) => v - descontos[i]));
  const itens = p.itens.map((it, i) => ({
    n: i + 1,
    codigo: it.codigo || String(i + 1),
    descricao: it.descricao,
    ncm: onlyDigits(it.ncm),
    cfop: String(it.cfop || (idDest === "1" ? "5102" : "6102")),
    unidade: String(it.unidade || "UN").toUpperCase(),
    qtd: Number(it.qtd),
    vUn: Number(it.valor_unit),
    vProd: brutos[i],
    vDesc: descontos[i],
    vFrete: fretes[i],
    csosn: String(it.csosn || "102"),
    origem: String(it.origem ?? "0"),
    info: it.info || "",
  }));
  const tot = {
    vProd: r2(itens.reduce((s, x) => s + x.vProd, 0)),
    vDesc: r2(itens.reduce((s, x) => s + x.vDesc, 0)),
    vFrete: r2(itens.reduce((s, x) => s + x.vFrete, 0)),
  };
  tot.vNF = r2(tot.vProd - tot.vDesc + tot.vFrete);

  // ---- ide ----
  const indPres = String(p.indPres || "9");
  const ide =
    tag("cUF", cUF) + tag("cNF", cNF) + tag("natOp", txt(p.natOp || "Venda de mercadoria", 60)) + tag("mod", "55") +
    tag("serie", serie) + tag("nNF", nNF) + tag("dhEmi", dh) + tag("tpNF", "1") + tag("idDest", idDest) +
    tag("cMunFG", onlyDigits(emp.cod_municipio)) + tag("tpImp", "1") + tag("tpEmis", "1") + tag("cDV", chave.slice(-1)) +
    tag("tpAmb", tpAmb) + tag("finNFe", String(p.finNFe || "1")) +
    tag("indFinal", String(p.indFinal ?? (indIEDest === "1" ? "0" : "1"))) +
    tag("indPres", indPres) +
    (["2", "3", "4", "5", "9"].includes(indPres) ? tag("indIntermed", String(p.indIntermed ?? "0")) : "") +
    tag("procEmi", "0") + tag("verProc", txt(p.verProc || "FM3D 1.0", 20)) +
    (p.refs || []).map((k) => `<NFref><refNFe>${onlyDigits(k)}</refNFe></NFref>`).join("");

  // ---- emitente ----
  const emit =
    tag("CNPJ", onlyDigits(emp.cnpj)) + tag("xNome", txt(emp.razao, 60)) + tag("xFant", txt(emp.fantasia, 60)) +
    T("enderEmit",
      tag("xLgr", txt(emp.logradouro, 60)) + tag("nro", txt(emp.numero || "S/N", 60)) + tag("xCpl", txt(emp.complemento, 60)) +
      tag("xBairro", txt(emp.bairro, 60)) + tag("cMun", onlyDigits(emp.cod_municipio)) + tag("xMun", txt(emp.municipio, 60)) +
      tag("UF", ufEmit) + tag("CEP", onlyDigits(emp.cep)) + tag("cPais", "1058") + tag("xPais", "BRASIL") +
      (onlyDigits(emp.fone).length >= 6 ? tag("fone", onlyDigits(emp.fone).slice(0, 14)) : "")) +
    tag("IE", onlyDigits(emp.ie)) + tag("CRT", "4");

  // ---- destinatário ----
  const dest =
    (docDest.length === 11 ? tag("CPF", docDest) : tag("CNPJ", docDest)) +
    tag("xNome", tpAmb === "2" ? HOMOLOG_NOME : txt(d.nome, 60)) +
    T("enderDest",
      tag("xLgr", txt(d.logradouro, 60)) + tag("nro", txt(d.numero || "S/N", 60)) + tag("xCpl", txt(d.complemento, 60)) +
      tag("xBairro", txt(d.bairro, 60)) + tag("cMun", onlyDigits(d.cod_municipio)) + tag("xMun", txt(d.municipio, 60)) +
      tag("UF", ufDest) + tag("CEP", onlyDigits(d.cep)) + tag("cPais", "1058") + tag("xPais", "BRASIL") +
      (onlyDigits(d.fone).length >= 6 ? tag("fone", onlyDigits(d.fone).slice(0, 14)) : "")) +
    tag("indIEDest", indIEDest) +
    (indIEDest === "1" ? tag("IE", onlyDigits(d.ie)) : "") +
    tag("email", txt(String(d.email || "").split(/[;, ]+/)[0], 60));

  // ---- itens (det) ----
  const dets = itens.map((it) => {
    const prod =
      tag("cProd", txt(it.codigo, 60)) + tag("cEAN", "SEM GTIN") + tag("xProd", txt(it.descricao, 120)) + tag("NCM", it.ncm) +
      tag("CFOP", it.cfop) + tag("uCom", txt(it.unidade, 6)) + tag("qCom", d4(it.qtd)) + tag("vUnCom", d10(it.vUn)) +
      tag("vProd", d2(it.vProd)) + tag("cEANTrib", "SEM GTIN") + tag("uTrib", txt(it.unidade, 6)) + tag("qTrib", d4(it.qtd)) +
      tag("vUnTrib", d10(it.vUn)) + (it.vFrete > 0 ? tag("vFrete", d2(it.vFrete)) : "") +
      (it.vDesc > 0 ? tag("vDesc", d2(it.vDesc)) : "") + tag("indTot", "1");
    const icms = T("ICMS", T("ICMSSN" + (it.csosn === "900" ? "900" : "102"), tag("orig", it.origem) + tag("CSOSN", it.csosn) + (it.csosn === "900" ? tag("modBC", "3") + tag("vBC", "0.00") + tag("pICMS", "0.0000") + tag("vICMS", "0.00") : "")));
    const pis = T("PIS", T("PISOutr", tag("CST", "49") + tag("vBC", "0.00") + tag("pPIS", "0.0000") + tag("vPIS", "0.00")));
    const cof = T("COFINS", T("COFINSOutr", tag("CST", "49") + tag("vBC", "0.00") + tag("pCOFINS", "0.0000") + tag("vCOFINS", "0.00")));
    return `<det nItem="${it.n}">${T("prod", prod)}<imposto>${icms}${pis}${cof}</imposto>${it.info ? tag("infAdProd", txt(it.info, 500)) : ""}</det>`;
  }).join("");

  const z = "0.00";
  const total = `<total>${T("ICMSTot",
    tag("vBC", z) + tag("vICMS", z) + tag("vICMSDeson", z) + tag("vFCP", z) + tag("vBCST", z) + tag("vST", z) + tag("vFCPST", z) +
    tag("vFCPSTRet", z) + tag("vProd", d2(tot.vProd)) + tag("vFrete", d2(tot.vFrete)) + tag("vSeg", z) + tag("vDesc", d2(tot.vDesc)) +
    tag("vII", z) + tag("vIPI", z) + tag("vIPIDevol", z) + tag("vPIS", z) + tag("vCOFINS", z) + tag("vOutro", z) + tag("vNF", d2(tot.vNF)))}</total>`;

  // ---- transporte ----
  const fr = p.frete || {};
  const tr = fr.transportadora || {};
  const trdoc = onlyDigits(tr.doc);
  const transporta = tr.nome || trdoc
    ? T("transporta",
        (trdoc.length === 14 ? tag("CNPJ", trdoc) : trdoc.length === 11 ? tag("CPF", trdoc) : "") + tag("xNome", txt(tr.nome, 60)) +
        (onlyDigits(tr.ie) ? tag("IE", onlyDigits(tr.ie)) : "") + tag("xEnder", txt(tr.endereco, 60)) + tag("xMun", txt(tr.municipio, 60)) +
        tag("UF", tr.uf ? String(tr.uf).toUpperCase() : ""))
    : "";
  const v = p.volumes || {};
  const vol = Number(v.qtd) > 0 || Number(v.pesoB) > 0
    ? T("vol", tag("qVol", Number(v.qtd) > 0 ? String(Math.round(Number(v.qtd))) : "") + tag("esp", txt(v.especie, 60)) + tag("marca", txt(v.marca, 60)) +
        tag("pesoL", Number(v.pesoL) > 0 ? Number(v.pesoL).toFixed(3) : "") + tag("pesoB", Number(v.pesoB) > 0 ? Number(v.pesoB).toFixed(3) : ""))
    : "";
  const modFrete = String(fr.modalidade ?? (tot.vFrete > 0 ? "0" : "9"));
  const transp = `<transp>${tag("modFrete", modFrete)}${transporta}${vol}</transp>`;

  // ---- pagamento ----
  let pags = (p.pagamentos || []).filter((x) => Number(x.valor) > 0);
  if (!pags.length) pags = [{ forma: "sem_pagamento", valor: 0 }];
  else {
    // ajusta centavos de diferença na última forma para fechar com vNF
    const soma = r2(pags.reduce((s, x) => s + Number(x.valor), 0));
    if (Math.abs(soma - tot.vNF) <= 0.05) pags = pags.map((x, i) => (i === pags.length - 1 ? { ...x, valor: r2(Number(x.valor) + (tot.vNF - soma)) } : x));
  }
  const pag = `<pag>${pags.map((x) => {
    const t = PAGAMENTO[x.forma] || "99";
    return T("detPag",
      tag("tPag", t) + (t === "99" ? tag("xPag", txt(x.descricao || "Outros", 60)) : "") + tag("vPag", d2(x.valor)) +
      (["03", "04", "15", "17", "18"].includes(t) ? T("card", tag("tpIntegra", "2")) : ""));  // NT 2024.003: Pix/boleto também levam o grupo de pagamento eletrônico (rejeição 391)
  }).join("")}</pag>`;

  const infCpl = p.infCpl ? `<infAdic>${tag("infCpl", txt(p.infCpl, 2000))}</infAdic>` : "";
  const inf = `<infNFe Id="${id}" versao="4.00"><ide>${ide}</ide><emit>${emit}</emit><dest>${dest}</dest>${dets}${total}${transp}${pag}${infCpl}</infNFe>`;
  return { xml: `<NFe xmlns="http://www.portalfiscal.inf.br/nfe">${inf}</NFe>`, chave, id, totais: tot, dh };
}
