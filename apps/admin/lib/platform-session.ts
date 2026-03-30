export const PLATFORM_TOKEN_KEY = "ventaxlink_platform_token";

export function clearPlatformSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PLATFORM_TOKEN_KEY);
}

export function savePlatformToken(token: string): void {
  localStorage.setItem(PLATFORM_TOKEN_KEY, token);
}

export function getPlatformToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PLATFORM_TOKEN_KEY);
}
