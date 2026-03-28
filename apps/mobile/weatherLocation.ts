import * as Location from "expo-location";

export type ResolveCoordsResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; kind: "permission" | "services" | "unavailable" };

/**
 * Foreground location for Open-Meteo: prefer a recent cached fix, then a low-power GPS read.
 */
export async function resolveCoordsForWeather(): Promise<ResolveCoordsResult> {
  try {
    const servicesOn = await Location.hasServicesEnabledAsync();
    if (!servicesOn) {
      return { ok: false, kind: "services" };
    }

    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") {
      return { ok: false, kind: "permission" };
    }

    const last = await Location.getLastKnownPositionAsync({
      maxAge: 600_000,
      requiredAccuracy: 100_000,
    });
    if (last?.coords) {
      const { latitude, longitude } = last.coords;
      if (
        typeof latitude === "number" &&
        typeof longitude === "number" &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
      ) {
        return { ok: true, latitude, longitude };
      }
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
      mayShowUserSettingsDialog: true,
    });
    const { latitude, longitude } = pos.coords;
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return { ok: false, kind: "unavailable" };
    }
    return { ok: true, latitude, longitude };
  } catch {
    return { ok: false, kind: "unavailable" };
  }
}
