import { configureMlApiBaseUrl } from "@agriora/core";
import Constants from "expo-constants";

const envUrl = process.env.EXPO_PUBLIC_ML_API_URL?.trim() ?? "";

function envIsEmptyOrLoopback(): boolean {
  if (!envUrl) return true;
  try {
    const withProto = envUrl.includes("://") ? envUrl : `http://${envUrl}`;
    const u = new URL(withProto);
    const h = u.hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1";
  } catch {
    return false;
  }
}

function isLikelyLanOrEmulatorHost(host: string): boolean {
  if (host === "10.0.2.2") return true;
  return (
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)
  );
}

function hostFromMaybeUrl(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const withProto = t.includes("://") ? t : `http://${t}`;
  try {
    const u = new URL(withProto);
    const h = u.hostname?.trim().toLowerCase();
    return h || undefined;
  } catch {
    const h = t.split("/")[0]?.split(":")[0]?.trim().toLowerCase();
    return h || undefined;
  }
}

function candidateExpoHosts(): string[] {
  const c = Constants as unknown as {
    expoConfig?: { hostUri?: string; extra?: { expoGo?: { debuggerHost?: string } } };
    expoGoConfig?: { debuggerHost?: string };
    manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
    manifest?: { debuggerHost?: string };
  };
  return [
    c.expoConfig?.hostUri,
    c.expoGoConfig?.debuggerHost,
    c.manifest2?.extra?.expoGo?.debuggerHost,
    c.expoConfig?.extra?.expoGo?.debuggerHost,
    c.manifest?.debuggerHost,
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function inferMlApiFromExpoHost(): string | undefined {
  for (const raw of candidateExpoHosts()) {
    const host = hostFromMaybeUrl(raw);
    if (!host || host === "localhost" || host === "127.0.0.1") continue;
    if (!isLikelyLanOrEmulatorHost(host)) continue;
    return `http://${host}:8000`;
  }
  return undefined;
}

/** Expo Go on a phone cannot reach 127.0.0.1 on your Mac; use Metro’s host (LAN or 10.0.2.2). */
export function applyDevMlApiHostFromExpo(): void {
  if (!envIsEmptyOrLoopback()) return;
  const inferred = inferMlApiFromExpoHost();
  if (inferred) {
    configureMlApiBaseUrl(inferred);
  }
}
