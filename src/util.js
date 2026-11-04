// Funções de apoio da NF-e (chave de acesso, números, datas).

export const onlyDigits = (s) => String(s ?? "").replace(/\D/g, "");
export const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Código IBGE das UFs (cUF).
export const UF_CODE = {
  RO: "11", AC: "12", AM: "13", RR: "14", PA: "15", AP: "16", TO: "17", MA: "21", PI: "22", CE: "23",
  RN: "24", PB: "25", PE: "26", AL: "27", SE: "28", BA: "29", MG: "31", ES: "32", RJ: "33", SP: "35",
  PR: "41", SC: "42", RS: "43", MS: "50", MT: "51", GO: "52", DF: "53",
};

/** UF (sigla) do emitente a partir dos 2 primeiros dígitos da chave de acesso. */
export function ufDaChave(chave) {
  const c = onlyDigits(chave).slice(0, 2);
  return Object.keys(UF_CODE).find((k) => UF_CODE[k] === c) || "SP";
}

/** Dígito verificador (módulo 11) da chave de acesso de 43 posições. */
export function dvChave(chave43) {
  let peso = 2;
  let soma = 0;
  for (let i = chave43.length - 1; i >= 0; i--) {
    soma += Number(chave43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto === 0 || resto === 1 ? 0 : 11 - resto;
}

/** Chave de acesso (44 dígitos): cUF AAMM CNPJ mod serie nNF tpEmis cNF DV */
export function montarChave({ cUF, aamm, cnpj, mod = "55", serie, nNF, tpEmis = "1", cNF }) {
  const base =
    String(cUF).padStart(2, "0") +
    String(aamm).padStart(4, "0") +
    onlyDigits(cnpj).padStart(14, "0") +
    String(mod).padStart(2, "0") +
    String(Number(serie)).padStart(3, "0") +
    String(Number(nNF)).padStart(9, "0") +
    String(tpEmis) +
    String(cNF).padStart(8, "0");
  return base + dvChave(base);
}

/** Data/hora no formato da NF-e, horário de Brasília: AAAA-MM-DDThh:mm:ss-03:00 */
export function dhBrasilia(d = new Date()) {
  const t = new Date(d.getTime() - 3 * 3600 * 1000);
  return t.toISOString().slice(0, 19) + "-03:00";
}

export function cNFAleatorio() {
  return String(Math.floor(Math.random() * 99999999)).padStart(8, "0");
}

export const PAGAMENTO = {
  dinheiro: "01", cheque: "02", cartao_credito: "03", cartao_debito: "04", credito_loja: "05",
  boleto: "15", deposito: "16", pix: "17", transferencia: "18", parcelado: "99", outros: "99", sem_pagamento: "90",
};
