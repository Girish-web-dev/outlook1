import axios, { AxiosError } from "axios";

export const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
export const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, "");

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    "content-type": "application/json"
  }
});

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data: unknown = error.response?.data;
    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error?: unknown }).error === "string"
    ) {
      return (data as { error: string }).error;
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected application error";
}
