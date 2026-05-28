export const DEMO_MODE_STORAGE_KEY = "vestra.demoMode";
export const DEMO_MODE_ENABLED_VALUE = "enabled";

export function isDemoModeValue(value: string | null) {
  return value === DEMO_MODE_ENABLED_VALUE;
}

export function parseDemoModeValue(value: string | null) {
  return isDemoModeValue(value);
}
