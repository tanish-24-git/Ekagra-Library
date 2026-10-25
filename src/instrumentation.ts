// Node 24 API, newer than the installed @types/node.
type TlsWithSystemCa = typeof import("node:tls") & {
  getCACertificates?: (type: "default" | "system") => string[];
  setDefaultCACertificates?: (certs: string[]) => void;
};

// Runs once when the server starts.
export async function register() {
  // In development, also trust the operating system's certificates. Office
  // networks that inspect HTTPS sign traffic with their own root certificate,
  // which Windows trusts but Node doesn't, so database requests to Neon fail
  // with "fetch failed". Same effect as NODE_OPTIONS=--use-system-ca.
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "development") {
    const tls = (await import("node:tls")) as TlsWithSystemCa;
    if (tls.getCACertificates && tls.setDefaultCACertificates) {
      tls.setDefaultCACertificates([...new Set([...tls.getCACertificates("default"), ...tls.getCACertificates("system")])]);
    }
  }
}
