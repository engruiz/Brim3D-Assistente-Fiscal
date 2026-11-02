// Leitura do certificado digital A1 (.pfx / .p12). Usa node-forge porque funciona em qualquer ambiente
// (inclusive no .exe), mesmo com certificados em formatos antigos.
import forge from "node-forge";

export class CertError extends Error {}

function pemKey(privateKey) {
  return forge.pki.privateKeyToPem(privateKey);
}

/** Abre o .pfx e devolve { keyPem, certPem, chainPem, certB64, cnpj, nome, validade, ... } */
export function abrirPfx(pfxBuffer, senha) {
  let p12;
  try {
    const der = forge.util.createBuffer(Buffer.from(pfxBuffer).toString("binary"));
    const asn1 = forge.asn1.fromDer(der);
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, String(senha ?? ""));
  } catch (e) {
    const msg = String(e?.message || e);
    if (/password|mac|invalid|decrypt/i.test(msg)) throw new CertError("Senha do certificado incorreta (ou arquivo inválido).");
    throw new CertError("Não consegui ler o arquivo do certificado. Confira se é o arquivo .pfx do e-CNPJ A1.");
  }
  const bagsKey = [
    ...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || []),
    ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || []),
  ];
  const bagsCert = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  if (!bagsKey.length || !bagsCert.length) throw new CertError("O arquivo não contém chave privada e certificado.");
  const key = bagsKey[0].key;
  const certs = bagsCert.map((b) => b.cert).filter(Boolean);
  // certificado "folha" = o que casa com a chave privada
  const nKey = key.n?.toString(16);
  const leaf = certs.find((c) => c.publicKey?.n?.toString(16) === nKey) || certs[0];
  const chain = certs.filter((c) => c !== leaf);

  const subject = leaf.subject.attributes.map((a) => `${a.shortName || a.name}=${a.value}`).join(", ");
  const cn = leaf.subject.getField("CN")?.value || "";
  let cnpj = (cn.match(/:(\d{14})\b/) || [])[1] || "";
  if (!cnpj) {
    // ICP-Brasil: o CNPJ também vem no campo "otherName" 2.16.76.1.3.3
    const san = leaf.getExtension("subjectAltName");
    const raw = san ? forge.asn1.toDer(forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [])).getBytes() : "";
    const alt = JSON.stringify(san || {}) + raw;
    cnpj = (alt.match(/\d{14}/) || [])[0] || "";
  }
  const certB64 = forge.util.encode64(forge.asn1.toDer(forge.pki.certificateToAsn1(leaf)).getBytes());
  const agora = new Date();
  const vence = leaf.validity.notAfter;
  return {
    keyPem: pemKey(key),
    certPem: forge.pki.certificateToPem(leaf),
    chainPem: chain.map((c) => forge.pki.certificateToPem(c)).join(""),
    certB64,
    cnpj,
    nome: cn.replace(/:\d{14}$/, "").trim(),
    subject,
    inicio: leaf.validity.notBefore.toISOString(),
    validade: vence.toISOString(),
    diasParaVencer: Math.floor((vence.getTime() - agora.getTime()) / 86400000),
    vencido: vence.getTime() < agora.getTime(),
  };
}
