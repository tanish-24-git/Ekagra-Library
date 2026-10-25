import "server-only";
import tls from "node:tls";

// In development, also trust the operating system's certificates. Office
// networks that inspect HTTPS sign traffic with their own root certificate,
// which Windows trusts but Node doesn't, so requests to Neon fail with
// "fetch failed". Same effect as NODE_OPTIONS=--use-system-ca. Imported by
// the database and auth clients, so it applies as soon as either loads,
// including after a hot reload, with no server restart.

// Node 24 API, newer than the installed @types/node.
const nodeTls = tls as typeof tls & {
  getCACertificates?: (type: "default" | "system") => string[];
  setDefaultCACertificates?: (certs: string[]) => void;
};

if (process.env.NODE_ENV === "development" && nodeTls.getCACertificates && nodeTls.setDefaultCACertificates) {
  nodeTls.setDefaultCACertificates([...new Set([...nodeTls.getCACertificates("default"), ...nodeTls.getCACertificates("system")])]);
}
