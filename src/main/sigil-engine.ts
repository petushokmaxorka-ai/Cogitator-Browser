// ═══════════════════════════════════════════════════════════
// Sigil Engine — Cryptographic Digital Signature Module
// COGITATOR BROWSER v2 | Dark Mechanicus Edition
//
// Implements RSA/ECDSA signing via Node.js native crypto.
// PKCS#12 import with node-forge for certificate extraction.
// Detached signatures (.sig), SHA-256 hashing, hex encoding.
// ═══════════════════════════════════════════════════════════

import {
  createSign,
  createVerify,
  createHash,
  randomBytes,

  privateDecrypt,
  publicEncrypt,
  createCipheriv,
  createDecipheriv,
} from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, basename, extname } from 'path';
import { app } from 'electron';

// ═══ Forge для парсинга PKCS#12 ──────────────────────────
import * as forge from 'node-forge';

// ── Типы ──────────────────────────────────────────────────

/** Supported certificate / key algorithms */
export type CertAlgorithm = 'rsa' | 'ecdsa' | 'gost';

/** Imported certificate metadata */
export interface Certificate {
  id: string;
  name: string;
  type: CertAlgorithm;
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  thumbprint: string;
  hasPrivateKey: boolean;
}

/** Record of a digital signature applied to a file */
export interface Signature {
  id: string;
  fileName: string;
  filePath: string;
  certificateId: string;
  certificateName: string;
  signDate: number;
  algorithm: string;
  signatureHex: string;
  hashHex: string;
}

/** Engine configuration */
export interface SigilConfig {
  defaultCertificate: string | null;
  timestampEnabled: boolean;
  detachedSignature: boolean;
}

/** Key pair generated or loaded for signing */
export interface KeyPair {
  privateKey: string;
  publicKey: string;
}

/** Parsed PKCS#12 bag with friendly name */
interface ParsedP12Bag {
  cert: forge.pki.Certificate;
  friendlyName: string;
  privateKey?: forge.pki.PrivateKey;
}

// ═══ Constants ────────────────────────────────────────────

const SIGIL_DIR_NAME = 'sigil';
const CONFIG_FILE = 'config.json';
const SIGNATURES_FILE = 'signatures.json';
const CERT_META_EXT = '.cert.json';
const P12_EXT = '.p12';
const PEM_EXT = '.pem';
const KEY_EXT = '.key';

// ── Internal: paths (initialized lazily for testability) ──

let _sigilDirPath: string | null = null;

function getSigilDir(): string {
  if (!_sigilDirPath) {
    _sigilDirPath = join(app.getPath('userData'), SIGIL_DIR_NAME);
  }
  return _sigilDirPath;
}

/** Override base path for unit tests */
export function __setSigilDirForTest(dir: string): void {
  _sigilDirPath = dir;
}

// ═══ SigilEngine Class ─═══════════════════════════════════

export class SigilEngine {
  private config: SigilConfig;
  private configPath: string;
  private signaturesPath: string;
  private signatures: Signature[] = [];
  private _keyPairs = new Map<string, KeyPair>();

  constructor() {
    const dir = getSigilDir();
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.configPath = join(dir, CONFIG_FILE);
    this.signaturesPath = join(dir, SIGNATURES_FILE);

    // ── Load config ──
    if (existsSync(this.configPath)) {
      try {
        this.config = JSON.parse(readFileSync(this.configPath, 'utf8'));
      } catch {
        this.config = this.getDefaultConfig();
      }
    } else {
      this.config = this.getDefaultConfig();
    }

    // ── Load signatures log ──
    if (existsSync(this.signaturesPath)) {
      try {
        this.signatures = JSON.parse(readFileSync(this.signaturesPath, 'utf8'));
      } catch {
        this.signatures = [];
      }
    }
  }

  private getDefaultConfig(): SigilConfig {
    return {
      defaultCertificate: null,
      timestampEnabled: false,
      detachedSignature: true,
    };
  }

  // ── Persistence ─────────────────────────────────────────

  private saveConfig(): void {
    writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  private saveSignatures(): void {
    writeFileSync(this.signaturesPath, JSON.stringify(this.signatures, null, 2));
  }

  private certMetaPath(certId: string): string {
    return join(getSigilDir(), `${certId}${CERT_META_EXT}`);
  }

  private p12Path(certId: string): string {
    return join(getSigilDir(), `${certId}${P12_EXT}`);
  }

  private pemPath(certId: string): string {
    return join(getSigilDir(), `${certId}${PEM_EXT}`);
  }

  private keyPath(certId: string): string {
    return join(getSigilDir(), `${certId}${KEY_EXT}`);
  }

  // ── Config API ──────────────────────────────────────────

  getConfig(): SigilConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<SigilConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
  }

  // ═══ Certificate: Import PKCS#12 ═════════════════════════

  /**
   * Import a PKCS#12 (.p12 / .pfx) file.
   * Extracts certificate metadata and private key via node-forge.
   */
  async importPKCS12(filePath: string, password: string): Promise<Certificate> {
    const p12Data = readFileSync(filePath);
    const p12Der = forge.asn1.fromDer(p12Data.toString('binary'));

    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Der, false, password);

    // Extract bags
    const certBags = this.extractCertBags(p12);
    if (certBags.length === 0) {
      throw new Error('No certificates found in PKCS#12 file');
    }

    const primaryBag = certBags[0];
    const cert = primaryBag.cert;
    const subject = cert.subject.attributes
      .map((a) => `${a.shortName}=${a.value}`)
      .join(', ');
    const issuer = cert.issuer.attributes
      .map((a) => `${a.shortName}=${a.value}`)
      .join(', ');

    // Compute SHA-256 thumbprint of raw cert
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    const md = forge.md.sha256.create();
    md.update(certDer);
    const thumbprint = md.digest().toHex();

    // Determine algorithm from public key OID
    const pubKeyOid = this.extractPublicKeyOid(cert);
    const algo: CertAlgorithm = this.detectAlgorithm(pubKeyOid);

    // Generate unique ID
    const certId = randomBytes(8).toString('hex');

    // Store .p12 copy
    writeFileSync(this.p12Path(certId), p12Data);

    // Save PEM certificate
    const certPem = forge.pki.certificateToPem(cert);
    writeFileSync(this.pemPath(certId), certPem);

    // Save private key if present
    if (primaryBag.privateKey) {
      const keyPem = forge.pki.privateKeyToPem(primaryBag.privateKey);
      writeFileSync(this.keyPath(certId), keyPem);
    }

    // Build metadata record
    const record: Certificate = {
      id: certId,
      name: primaryBag.friendlyName || basename(filePath, extname(filePath)),
      type: algo,
      subject: subject || 'CN=Unknown',
      issuer: issuer || 'CN=Unknown',
      validFrom: cert.validity.notBefore.toISOString(),
      validTo: cert.validity.notAfter.toISOString(),
      serialNumber: cert.serialNumber,
      thumbprint: thumbprint.slice(0, 32),
      hasPrivateKey: !!primaryBag.privateKey,
    };

    writeFileSync(this.certMetaPath(certId), JSON.stringify(record, null, 2));
    return record;
  }

  /** Extract certificate + private-key bags from parsed P12 */
  private extractCertBags(p12: forge.pkcs12.Pkcs12Pfx): ParsedP12Bag[] {
    const result: ParsedP12Bag[] = [];
    const bags = p12.getBags({ bagType: forge.pki.oids.certBag });

    for (const key of Object.keys(bags)) {
      const bagArray = bags[key];
      if (!Array.isArray(bagArray)) continue;
      for (const bag of bagArray) {
        if (bag.cert) {
          result.push({
            cert: bag.cert,
            friendlyName: (bag as any).friendlyName?.[0] || '',
            privateKey: undefined,
          });
        }
      }
    }

    // Also look for key bags and attach to matching cert
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    for (const key of Object.keys(keyBags)) {
      const bagArray = keyBags[key];
      if (!Array.isArray(bagArray)) continue;
      for (const bag of bagArray) {
        if (bag.key && result.length > 0) {
          result[0].privateKey = bag.key;
        }
      }
    }

    return result;
  }

  private extractPublicKeyOid(cert: forge.pki.Certificate): string {
    try {
      const pubKeyAsn1 = forge.pki.publicKeyToAsn1(cert.publicKey);
      // The algorithmIdentifier is inside the SubjectPublicKeyInfo
      return (cert.publicKey as any).algorithm || '';
    } catch {
      return '';
    }
  }

  private detectAlgorithm(oid: string): CertAlgorithm {
    // RSA: 1.2.840.113549.1.1.1
    // ECDSA: 1.2.840.10045.2.1
    // GOST R 34.10-2012: 1.2.643.7.1.1.1.1 / 1.2.643.7.1.1.1.2
    if (oid.includes('1.2.840.113549') || oid.includes('rsa')) return 'rsa';
    if (oid.includes('1.2.840.10045') || oid.includes('ec')) return 'ecdsa';
    if (oid.includes('1.2.643')) return 'gost';
    // NOTE: GOST certificates are detected but signing falls back to RSA-SHA256
    // because Node.js crypto does not natively support GOST R 34.10-2012.
    return 'rsa'; // default
  }

  // ═══ Certificate: List / Get / Delete ════════════════════

  /** List all imported certificates */
  getCertificates(): Certificate[] {
    const certs: Certificate[] = [];
    const dir = getSigilDir();
    if (!existsSync(dir)) return certs;

    const files = readdirSync(dir);
    for (const file of files) {
      if (file.endsWith(CERT_META_EXT)) {
        try {
          const cert = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Certificate;
          certs.push(cert);
        } catch {
          // skip corrupted cert metadata
        }
      }
    }
    return certs;
  }

  /** Get a single certificate by ID */
  getCertificate(id: string): Certificate | null {
    const path = this.certMetaPath(id);
    if (!existsSync(path)) return null;
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as Certificate;
    } catch {
      return null;
    }
  }

  /** Permanently delete a certificate and its keys */
  deleteCertificate(id: string): void {
    const paths = [
      this.certMetaPath(id),
      this.p12Path(id),
      this.pemPath(id),
      this.keyPath(id),
    ];
    for (const p of paths) {
      if (existsSync(p)) {
        unlinkSync(p);
      }
    }

    // Remove from default if it was set
    if (this.config.defaultCertificate === id) {
      this.config.defaultCertificate = null;
      this.saveConfig();
    }
  }

  // ═══ File Signing ═════════════════════════════════════════

  /**
   * Sign a file using the specified certificate's private key.
   * Supports RSA-SHA256 and ECDSA-SHA256.
   */
  async signFile(filePath: string, certificateId: string): Promise<Signature> {
    const cert = this.getCertificate(certificateId);
    if (!cert) {
      throw new Error(`Certificate not found: ${certificateId}`);
    }
    if (!cert.hasPrivateKey) {
      throw new Error(
        `Certificate "${cert.name}" does not have a private key. ` +
          `Import the certificate with its private key (PKCS#12 .p12 file) to sign files.`
      );
    }

    // Read file and compute SHA-256 hash
    const fileData = readFileSync(filePath);
    const fileHash = createHash('sha256').update(fileData).digest('hex');

    // Load private key
    const keyFile = this.keyPath(certificateId);
    let signatureHex: string;

    if (cert.type === 'rsa' && existsSync(keyFile)) {
      // RSA signing with native Node.js crypto
      const keyPem = readFileSync(keyFile, 'utf8');
      const signer = createSign('RSA-SHA256');
      signer.update(fileHash);
      signatureHex = signer.sign(keyPem, 'hex');
    } else if (cert.type === 'ecdsa' && existsSync(keyFile)) {
      // ECDSA signing
      const keyPem = readFileSync(keyFile, 'utf8');
      const signer = createSign('ECDSA-SHA256');
      signer.update(fileHash);
      signatureHex = signer.sign(keyPem, 'hex');
    } else {
      throw new Error(
        `Private key not found for certificate "${cert.name}". ` +
          `The key file may have been deleted or moved.`
      );
    }

    // Build signature record
    const sig: Signature = {
      id: randomBytes(8).toString('hex'),
      fileName: basename(filePath),
      filePath,
      certificateId,
      certificateName: cert.name,
      signDate: Date.now(),
      algorithm: cert.type === 'ecdsa' ? 'ECDSA-SHA256' : 'RSA-SHA256',
      signatureHex,
      hashHex: fileHash,
    };

    this.signatures.push(sig);
    this.saveSignatures();

    // ── Save detached signature file (.sig) ──
    if (this.config.detachedSignature) {
      const sigPath = `${filePath}.sig`;
      const sigData = {
        algorithm: sig.algorithm,
        hash: sig.hashHex,
        signature: sig.signatureHex,
        certificate: cert.subject,
        certificateThumbprint: cert.thumbprint,
        date: sig.signDate,
        fileName: sig.fileName,
        version: '1.0',
      };
      writeFileSync(sigPath, JSON.stringify(sigData, null, 2));
    }

    return sig;
  }

  // ═══ Signature Verification ═══════════════════════════════

  /**
   * Verify a signature against a file.
   * Requires the .pem certificate file (public key).
   */
  async verifySignature(
    filePath: string,
    signatureHex: string,
    certificateId?: string,
  ): Promise<{ valid: boolean; message: string }> {
    try {
      const fileData = readFileSync(filePath);
      const fileHash = createHash('sha256').update(fileData).digest('hex');

      if (!certificateId) {
        // Try to find matching certificate from signatures log
        const sig = this.signatures.find((s) => s.filePath === filePath);
        if (sig) {
          certificateId = sig.certificateId;
        }
      }

      if (!certificateId) {
        return { valid: false, message: 'No certificate specified or found in log' };
      }

      const cert = this.getCertificate(certificateId);
      if (!cert) {
        return { valid: false, message: `Certificate not found: ${certificateId}` };
      }

      const pemFile = this.pemPath(certificateId);
      if (!existsSync(pemFile)) {
        return { valid: false, message: 'Public key certificate not available' };
      }

      const certPem = readFileSync(pemFile, 'utf8');

      // Verify using native crypto
      const verifier = createVerify(cert.type === 'ecdsa' ? 'ECDSA-SHA256' : 'RSA-SHA256');
      verifier.update(fileHash);
      const valid = verifier.verify(certPem, signatureHex, 'hex');

      return {
        valid,
        message: valid
          ? 'Signature is VALID — file integrity confirmed'
          : 'Signature is INVALID — file may have been tampered',
      };
    } catch (err: any) {
      return { valid: false, message: `Verification error: ${err.message}` };
    }
  }

  /**
   * Verify using a detached .sig file.
   */
  async verifyFromSigFile(filePath: string, sigFilePath: string): Promise<{ valid: boolean; message: string }> {
    try {
      const sigData = JSON.parse(readFileSync(sigFilePath, 'utf8'));
      const signatureHex = sigData.signature;

      // Try to find certificate by thumbprint
      const certs = this.getCertificates();
      let certId: string | undefined;
      if (sigData.certificateThumbprint) {
        const match = certs.find((c) => c.thumbprint === sigData.certificateThumbprint);
        if (match) certId = match.id;
      }

      return this.verifySignature(filePath, signatureHex, certId);
    } catch (err: any) {
      return { valid: false, message: `Failed to parse .sig file: ${err.message}` };
    }
  }

  // ═══ Signature Log ════════════════════════════════════════

  getSignatures(): Signature[] {
    return [...this.signatures];
  }

  getSignaturesForFile(filePath: string): Signature[] {
    return this.signatures.filter((s) => s.filePath === filePath);
  }

  deleteSignature(id: string): void {
    this.signatures = this.signatures.filter((s) => s.id !== id);
    this.saveSignatures();
  }

  // ═══ Encryption / Decryption (Bonus) ══════════════════════

  /**
   * Encrypt a file using RSA public key of a certificate.
   */
  async encryptFile(filePath: string, certificateId: string): Promise<string> {
    const cert = this.getCertificate(certificateId);
    if (!cert) throw new Error(`Certificate not found: ${certificateId}`);

    const pemFile = this.pemPath(certificateId);
    if (!existsSync(pemFile)) throw new Error('Public key not available');

    const certPem = readFileSync(pemFile, 'utf8');
    const forgeCert = forge.pki.certificateFromPem(certPem);

    const fileData = readFileSync(filePath);

    // Hybrid encryption: AES-256-CBC for data, RSA for key
    const aesKey = randomBytes(32);
    const iv = randomBytes(16);

    const cipher = createCipheriv('aes-256-cbc', aesKey, iv);
    let encrypted = cipher.update(fileData);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Encrypt AES key with RSA public key
    const encryptedKey = publicEncrypt(certPem, aesKey);

    // Build envelope
    const envelope = {
      key: encryptedKey.toString('base64'),
      iv: iv.toString('base64'),
      data: encrypted.toString('base64'),
      algorithm: 'RSA+AES-256-CBC',
      certificateId,
    };

    const outPath = `${filePath}.encrypted`;
    writeFileSync(outPath, JSON.stringify(envelope, null, 2));
    return outPath;
  }

  /**
   * Decrypt a file using RSA private key.
   */
  async decryptFile(encryptedFilePath: string, certificateId: string): Promise<string> {
    const keyFile = this.keyPath(certificateId);
    if (!existsSync(keyFile)) throw new Error('Private key not available');

    const envelope = JSON.parse(readFileSync(encryptedFilePath, 'utf8'));
    const keyPem = readFileSync(keyFile, 'utf8');

    const aesKey = privateDecrypt(keyPem, Buffer.from(envelope.key, 'base64'));
    const iv = Buffer.from(envelope.iv, 'base64');
    const data = Buffer.from(envelope.data, 'base64');

    const decipher = createDecipheriv('aes-256-cbc', aesKey, iv);
    let decrypted = decipher.update(data);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    const outPath = encryptedFilePath.replace('.encrypted', '.decrypted');
    writeFileSync(outPath, decrypted);
    return outPath;
  }

  // ═══ Generate Self-Signed Certificate (Demo) ══════════════

  /**
   * Generate a self-signed RSA certificate for testing.
   */
  generateSelfSigned(name: string): Certificate {
    const certId = randomBytes(8).toString('hex');

    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();

    cert.serialNumber = randomBytes(4).toString('hex');
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

    const attrs = [
      { name: 'commonName', value: name },
      { name: 'countryName', value: 'RU' },
      { name: 'organizationName', value: 'COGITATOR BROWSER' },
    ];
    cert.subject.attributes = attrs;
    cert.issuer.attributes = attrs;
    cert.publicKey = keys.publicKey;

    cert.sign(keys.privateKey, forge.md.sha256.create());

    // Save
    const certPem = forge.pki.certificateToPem(cert);
    const keyPem = forge.pki.privateKeyToPem(keys.privateKey);
    writeFileSync(this.pemPath(certId), certPem);
    writeFileSync(this.keyPath(certId), keyPem);

    const thumbprintMd = forge.md.sha256.create();
    thumbprintMd.update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes());
    const thumbprint = thumbprintMd.digest().toHex();

    const record: Certificate = {
      id: certId,
      name,
      type: 'rsa',
      subject: `CN=${name}`,
      issuer: `CN=${name}`,
      validFrom: cert.validity.notBefore.toISOString(),
      validTo: cert.validity.notAfter.toISOString(),
      serialNumber: cert.serialNumber,
      thumbprint: thumbprint.slice(0, 32),
      hasPrivateKey: true,
    };

    writeFileSync(this.certMetaPath(certId), JSON.stringify(record, null, 2));
    return record;
  }
}

// ═══ Singleton ─═══════════════════════════════════════════

let sigilEngine: SigilEngine | null = null;

export function getSigilEngine(): SigilEngine {
  if (!sigilEngine) sigilEngine = new SigilEngine();
  return sigilEngine;
}

/** Reset singleton (for testing) */
export function __resetSigilEngine(): void {
  sigilEngine = null;
}
