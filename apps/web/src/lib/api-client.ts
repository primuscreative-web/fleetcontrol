export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return requestWithRefresh<T>(path, init, true);
}

async function requestWithRefresh<T>(
  path: string,
  init: RequestInit | undefined,
  canRefresh: boolean,
): Promise<T> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  const response = await fetch(path.startsWith("http") ? path : `${apiBase}${path.startsWith("/api") ? path : `/api${path}`}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (response.status === 401 && canRefresh) {
    const refreshed = await fetch(`${apiBase}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (refreshed.ok) {
      return requestWithRefresh<T>(path, init, false);
    }
  }

  if (!response.ok) {
    throw new ApiError(await resolveErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function resolveErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? "Erro inesperado";
  } catch {
    return "Erro inesperado";
  }
}
