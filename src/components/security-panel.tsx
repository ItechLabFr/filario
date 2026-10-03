"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { authClient } from "@/lib/auth-client";

export function SecurityPanel() {
  const { data: session } = authClient.useSession();
  const [password, setPassword] = useState("");
  const [qr, setQr] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function beginTotp() {
    setError("");
    setMessage("");
    const result = await authClient.twoFactor.enable({
      password,
      method: "totp",
      issuer: "Filario"
    });

    if (result.error) {
      setError(result.error.message || "Impossible d'activer le MFA.");
      return;
    }

    if (result.data?.method === "totp") {
      setTotpUri(result.data.totpURI);
      setBackupCodes(result.data.backupCodes);
      setQr(await QRCode.toDataURL(result.data.totpURI, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 260
      }));
    }
  }

  async function verifyTotp() {
    setError("");
    const result = await authClient.twoFactor.verifyTotp({
      code: verificationCode.replace(/\s/g, ""),
      trustDevice: true
    });
    if (result.error) {
      setError(result.error.message || "Code incorrect.");
      return;
    }
    setMessage("MFA TOTP activé avec succès.");
    setQr("");
    setTotpUri("");
    setVerificationCode("");
  }

  async function disableTotp() {
    setError("");
    setMessage("");
    const result = await authClient.twoFactor.disable({ password });
    if (result.error) {
      setError(result.error.message || "Impossible de désactiver le MFA.");
      return;
    }
    setMessage("MFA désactivé.");
    setQr("");
    setBackupCodes([]);
  }

  async function addPasskey() {
    setError("");
    setMessage("");
    const result = await authClient.passkey.addPasskey({
      name: `Filario · ${new Date().toLocaleDateString("fr-FR")}`
    });
    if (result?.error) {
      setError(result.error.message || "Impossible d'ajouter la passkey.");
      return;
    }
    setMessage("Passkey ajoutée.");
  }

  return (
    <div className="grid grid-2">
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Authentification à deux facteurs</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.55 }}>
          Utilisez Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden ou toute application TOTP compatible.
        </p>

        {error && <div className="error" style={{ marginBottom: 15 }}>{error}</div>}
        {message && <div className="success" style={{ marginBottom: 15 }}>{message}</div>}

        <div className="form">
          <div className="field">
            <label>Mot de passe actuel</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>

          {!qr ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="button primary" type="button" onClick={beginTotp} disabled={!password}>
                Configurer TOTP
              </button>
              <button className="button danger" type="button" onClick={disableTotp} disabled={!password}>
                Désactiver TOTP
              </button>
            </div>
          ) : (
            <>
              <div className="qr-panel">
                <img src={qr} alt="QR code TOTP Filario" />
                <small style={{ color: "var(--muted)", marginTop: 8 }}>
                  Le QR est généré localement dans votre navigateur.
                </small>
              </div>
              <div className="field">
                <label>Code de vérification</label>
                <input className="input" inputMode="numeric" maxLength={6} value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} />
              </div>
              <button className="button primary" type="button" onClick={verifyTotp}>
                Confirmer l'activation
              </button>
              {totpUri && <details><summary>Configuration manuelle</summary><code style={{ overflowWrap: "anywhere" }}>{totpUri}</code></details>}
            </>
          )}

          {backupCodes.length > 0 && (
            <div>
              <strong>Codes de récupération</strong>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>Conservez-les hors de Filario.</p>
              <div className="card flat" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {backupCodes.map((code) => <code key={code}>{code}</code>)}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Passkeys</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.55 }}>
          Ajoutez Face ID, Touch ID, Windows Hello ou une clé de sécurité compatible WebAuthn.
        </p>
        <button className="button primary" type="button" onClick={addPasskey} disabled={!session?.user}>
          Ajouter une passkey
        </button>
        <p style={{ marginTop: 18, color: "var(--muted)", fontSize: 12, lineHeight: 1.5 }}>
          Une passkey est liée au domaine de l'instance. Après migration vers un autre domaine, elle devra être enregistrée à nouveau.
        </p>
      </section>
    </div>
  );
}
