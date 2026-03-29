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

function inferMlApiFromExpoHost(): string | undefined {
  const raw = Constants.expoConfig?.hostUri;
  if (!raw || typeof raw !== "string") return undefined;
  const host = raw.split(":")[0]?.trim();
  if (!host || host === "localhost" || host === "127.0.0.1")
    return undefined;
  if (!isLikelyLanOrEmulatorHost(host)) return undefined;
  return `http://${host}:8000`;
}

/** Expo Go on a phone cannot reach 127.0.0.1 on your Mac; use Metro’s host (LAN or 10.0.2.2). */
export function applyDevMlApiHostFromExpo(): void {
  if (!envIsEmptyOrLoopback()) return;
  const inferred = inferMlApiFromExpoHost();
  if (inferred) configureMlApiBaseUrl(inferred);
}
