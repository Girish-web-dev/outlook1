import { api, apiOrigin } from "./api";
import type { User } from "../types/auth";

export async function getCurrentUser(): Promise<User> {
  const response = await api.get<User>("/auth/me");
  return response.data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export function redirectToGoogleLogin(): void {
  window.location.href = `${apiOrigin}/api/auth/google`;
}
