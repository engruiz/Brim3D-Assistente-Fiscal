// Assinatura digital (XMLDSig) dos documentos da NF-e: RSA-SHA1 + C14N, assinatura "enveloped".
import { SignedXml } from "xml-crypto";

const C14N = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
const ENVELOPED = "http://www.w3.org/2000/09/xmldsig#enveloped-signature";

/**
 * Assina o elemento `tagAssinado` (infNFe, infEvento, infInut) do xml e coloca a <Signature> logo depois dele.
 * cert: { keyPem, certB64 }
 */
export function assinar(xml, tagAssinado, cert) {
  const sig = new SignedXml({
    privateKey: cert.keyPem,
    publicCert: `-----BEGIN CERTIFICATE-----\n${cert.certB64}\n-----END CERTIFICATE-----`,
    signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
    canonicalizationAlgorithm: C14N,
    getKeyInfoContent: () => `<X509Data><X509Certificate>${cert.certB64}</X509Certificate></X509Data>`,
  });
  sig.addReference({
    xpath: `//*[local-name(.)='${tagAssinado}']`,
    transforms: [ENVELOPED, C14N],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
  });
  sig.computeSignature(xml, { location: { reference: `//*[local-name(.)='${tagAssinado}']`, action: "after" } });
  return sig.getSignedXml();
}
