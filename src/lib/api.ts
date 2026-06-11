export const AUTH_SESSION_MARKER = "cookie-session";

export const buildAuthenticatedRequest = (token: string | null, init: RequestInit = {}): RequestInit => {
  const headers = new Headers(init.headers || {});

  if (token && token !== AUTH_SESSION_MARKER) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return {
    ...init,
    headers,
    credentials: "include",
  };
};

export const apiFetch = (input: RequestInfo | URL, token: string | null, init: RequestInit = {}) => (
  fetch(input, buildAuthenticatedRequest(token, init))
);
