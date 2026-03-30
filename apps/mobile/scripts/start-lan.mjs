import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";

function readEnvFile(filePath) {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function readEnvValue(source, key) {
  const line = source
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith(`${key}=`));
  if (!line) return "";
  return line.slice(line.indexOf("=") + 1).trim();
}

function hostFromMlApiUrl(urlText) {
  const t = String(urlText || "").trim();
  if (!t) return "";
  try {
    const withProto = t.includes("://") ? t : `http://${t}`;
    return new URL(withProto).hostname || "";
  } catch {
    return "";
  }
}

function isPrivateIpv4(host) {
  return (
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)
  );
}

function detectLanIpv4() {
  let ifaces;
  try {
    ifaces = networkInterfaces();
  } catch {
    return "";
  }
  const preferredNames = ["en0", "en1", "eth0", "wlan0"];

  for (const name of preferredNames) {
    const entries = ifaces[name] || [];
    for (const e of entries) {
      if (!e || e.internal || e.family !== "IPv4") continue;
      if (isPrivateIpv4(e.address)) return e.address;
    }
  }

  for (const entries of Object.values(ifaces)) {
    for (const e of entries || []) {
      if (!e || e.internal || e.family !== "IPv4") continue;
      if (isPrivateIpv4(e.address)) return e.address;
    }
  }

  return "";
}

const cwd = process.cwd();
const envDev = readEnvFile(resolve(cwd, ".env.development"));
const envDefault = readEnvFile(resolve(cwd, ".env"));
const configuredMlUrl =
  process.env.EXPO_PUBLIC_ML_API_URL ||
  readEnvValue(envDev, "EXPO_PUBLIC_ML_API_URL") ||
  readEnvValue(envDefault, "EXPO_PUBLIC_ML_API_URL");
const preferredHost =
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME ||
  detectLanIpv4() ||
  hostFromMlApiUrl(configuredMlUrl);

const childEnv = {
  ...process.env,
  EXPO_NO_DEPENDENCY_VALIDATION:
    process.env.EXPO_NO_DEPENDENCY_VALIDATION || "1",
};

if (
  preferredHost &&
  preferredHost !== "localhost" &&
  preferredHost !== "127.0.0.1"
) {
  childEnv.REACT_NATIVE_PACKAGER_HOSTNAME = preferredHost;
  // Keep mobile ML requests aligned with the same reachable host as Metro.
  childEnv.EXPO_PUBLIC_ML_API_URL = `http://${preferredHost}:8000`;
  console.log(`[mobile] LAN host: ${preferredHost}`);
  console.log(`[mobile] ML API URL: ${childEnv.EXPO_PUBLIC_ML_API_URL}`);
} else {
  console.log("[mobile] LAN host auto-detect unavailable; Expo will choose host.");
}

const extraArgs = process.argv.slice(2);
const args = ["expo", "start", "--host", "lan", ...extraArgs];
const child = spawn("npx", args, { stdio: "inherit", env: childEnv });

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

