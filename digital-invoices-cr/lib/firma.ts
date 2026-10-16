import forge from 'node-forge';
import { SignedXml } from 'xml-crypto';

// Firma el XML del comprobante con la llave criptográfica (.p12) del emisor.
//
// ALCANCE REAL vs. LO QUE FALTA: esto produce una firma XML-DSig envuelta
// (enveloped, RSA-SHA256) genuina - firma con la llave privada real extraída
// del .p12 que se suba, y es verificable con el certificado incluido. Lo que
// NO implementa todavía es el perfil completo que exige Hacienda,
// XAdES-EPES (política de firma ETSI TS 101 733 con los atributos
// SigningCertificate/SignaturePolicyIdentifier propios de XAdES). Para
// producción hace falta una librería con soporte XAdES-EPES completo o
// generar esos atributos a mano siguiendo la guía técnica de Hacienda.
//
// Con una llave .p12 real emitida por Hacienda, esta función ya firma de
// verdad; lo que no está garantizado es que Hacienda ACEPTE esa firma por
// faltar el perfil XAdES-EPES exacto.

export interface LlaveExtraida {
  privateKeyPem: string;
  certificatePem: string;
}

export function generarLlaveP12(pin: string, nombreComercial: string, cedula: string): Buffer {
  // Genera de verdad un par de llaves RSA + un certificado autofirmado, y los
  // empaqueta en un .p12 protegido con el PIN - técnicamente es lo mismo que
  // hace Hacienda al generar la llave desde Tico Factura (ellos usan su
  // propia CA para firmar el certificado; acá es autofirmado, ya que no
  // tenemos una CA de Hacienda real para emitir contra ella). El archivo que
  // sale de acá es un .p12 genuino: se puede volver a leer con
  // extraerLlaveP12 y usar para firmar de verdad.
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01' + Date.now();
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2);
  const attrs = [
    { name: 'commonName', value: nombreComercial || 'Emisor electrónico' },
    { name: 'countryName', value: 'CR' },
    { shortName: 'ST', value: 'San José' },
    { name: 'organizationName', value: nombreComercial || 'Emisor electrónico' },
    { shortName: 'OU', value: cedula || '' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs); // autofirmado
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, cert, pin, { algorithm: '3des' });
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return Buffer.from(p12Der, 'binary');
}

export function extraerLlaveP12(p12Buffer: Buffer, pin: string): LlaveExtraida {
  const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(p12Buffer.toString('binary')));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, pin);

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag];
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];

  if (!keyBags?.length || !certBags?.length) {
    throw new Error('El archivo .p12 no contiene una llave privada o un certificado válidos (¿PIN incorrecto?).');
  }

  const privateKey = keyBags[0].key!;
  const certificate = certBags[0].cert!;

  return {
    privateKeyPem: forge.pki.privateKeyToPem(privateKey),
    certificatePem: forge.pki.certificateToPem(certificate),
  };
}

export function firmarXml(xml: string, llave: LlaveExtraida): string {
  const sig = new SignedXml({
    privateKey: llave.privateKeyPem,
    publicCert: llave.certificatePem,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
  });
  sig.addReference({
    xpath: "//*[local-name(.)='FacturaElectronica' or local-name(.)='TiqueteElectronico' or local-name(.)='NotaCreditoElectronica' or local-name(.)='NotaDebitoElectronica']",
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature', 'http://www.w3.org/2001/10/xml-exc-c14n#'],
  });
  sig.computeSignature(xml);
  return sig.getSignedXml();
}
