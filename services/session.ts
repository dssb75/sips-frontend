export const SESSION_STORAGE_KEY = "sips-auth-session";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
}

export interface StoredSession {
  auth: AuthTokens;
  issuedAt: number;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isAuthTokens = (value: unknown): value is AuthTokens => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.access_token === "string" &&
    typeof value.refresh_token === "string" &&
    typeof value.token_type === "string" &&
    typeof value.expires_in === "number" &&
    typeof value.refresh_expires_in === "number"
  );
};

const parseStoredSession = (raw: string): StoredSession | null => {
  const parsed = JSON.parse(raw) as unknown;

  // Formato actual: { auth, issuedAt }
  if (isObject(parsed) && isAuthTokens(parsed.auth)) {
    return {
      auth: parsed.auth,
      issuedAt: typeof parsed.issuedAt === "number" ? parsed.issuedAt : Date.now(),
    };
  }

  // Compatibilidad con formato previo: LoginResponse plano
  if (isAuthTokens(parsed)) {
    return {
      auth: parsed,
      issuedAt: Date.now(),
    };
  }

  return null;
};

export const readSession = (): StoredSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const session = parseStoredSession(raw);
    if (!session) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
};

export const writeSession = (session: StoredSession): void => {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const clearSession = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(SESSION_STORAGE_KEY);
};

export const getAccessToken = (): string | null => {
  return readSession()?.auth.access_token ?? null;
};
