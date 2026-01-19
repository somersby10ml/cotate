import type {
  RateLimitStatusPayload,
  RefreshTokenResponse,
  RateLimits,
  RateLimitWindowSnapshot,
  AuthData
} from "../types/index.js";
import { windowMinutesFromSeconds } from "../utils/time.js";

const BASE_URL = "https://chatgpt.com/backend-api";
const RATE_LIMIT_URL = `${BASE_URL}/wham/usage`;
const REFRESH_TOKEN_URL = "https://auth.openai.com/oauth/token";
const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const USER_AGENT = "codex_cli_rs/0.0.0 (Windows 10.0.26100; x86_64) WindowsTerminal";

function snapshotFromPayload(payload: RateLimitStatusPayload): RateLimits {
  const primary = payload.rate_limit?.primary_window;
  const secondary = payload.rate_limit?.secondary_window;
  const credits = payload.credits ?? null;

  const toWindow = (window: RateLimitWindowSnapshot | null | undefined) => {
    if (!window) {
      return {
        used_percent: 0,
        window_minutes: 0,
        resets_at: 0
      };
    }
    return {
      used_percent: window.used_percent,
      window_minutes: windowMinutesFromSeconds(window.limit_window_seconds) ?? 0,
      resets_at: window.reset_at ?? 0
    };
  };

  return {
    primary: toWindow(primary),
    secondary: toWindow(secondary),
    credits: credits
      ? {
          has_credits: credits.has_credits,
          unlimited: credits.unlimited,
          balance: credits.balance ?? null
        }
      : {
          has_credits: false,
          unlimited: false,
          balance: null
        },
    plan_type: payload.plan_type ?? "unknown"
  };
}

async function refreshAccessToken(
  refreshToken: string
): Promise<RefreshTokenResponse | null> {
  const body = {
    client_id: CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: "openid profile email"
  };

  try {
    const response = await fetch(REFRESH_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as RefreshTokenResponse;
    return data;
  } catch (error) {
    return null;
  }
}

async function fetchRateLimit(
  accessToken: string,
  accountId?: string
): Promise<{ payload: RateLimitStatusPayload | null; status: number | null }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": USER_AGENT
  };

  if (accountId) {
    headers["ChatGPT-Account-Id"] = accountId;
  }

  try {
    const response = await fetch(RATE_LIMIT_URL, {
      method: "GET",
      headers
    });

    if (!response.ok) {
      return { payload: null, status: response.status };
    }

    const data = (await response.json()) as RateLimitStatusPayload;
    return { payload: data, status: response.status };
  } catch (error) {
    return { payload: null, status: null };
  }
}

export async function fetchRateLimitWithAuth(
  auth: AuthData,
  options: { allowRefresh?: boolean } = {}
): Promise<{
  rateLimits: RateLimits | null;
  updatedAuth?: AuthData;
  status: number | null;
}> {
  const allowRefresh = options.allowRefresh !== false;
  const accessToken = auth.tokens?.access_token;
  const refreshToken = auth.tokens?.refresh_token;
  const accountId = auth.tokens?.account_id;

  if (!accessToken) {
    return { rateLimits: null, status: null };
  }

  // First attempt with current access token
  const firstAttempt = await fetchRateLimit(accessToken, accountId);
  if (firstAttempt.payload) {
    return { rateLimits: snapshotFromPayload(firstAttempt.payload), status: firstAttempt.status };
  }

  // If 401, try to refresh token
  if (firstAttempt.status === 401 && allowRefresh && refreshToken) {
    const refreshed = await refreshAccessToken(refreshToken);
    if (!refreshed?.access_token) {
      return { rateLimits: null, status: firstAttempt.status };
    }

    const updatedAuth: AuthData = {
      ...auth,
      tokens: {
        ...auth.tokens,
        access_token: refreshed.access_token,
        id_token: refreshed.id_token ?? auth.tokens.id_token,
        refresh_token: refreshed.refresh_token ?? auth.tokens.refresh_token
      },
      last_refresh: new Date().toISOString()
    };

    // Retry with new access token
    const retry = await fetchRateLimit(refreshed.access_token, accountId);
    if (retry.payload) {
      return { rateLimits: snapshotFromPayload(retry.payload), updatedAuth, status: retry.status };
    }

    return { rateLimits: null, updatedAuth, status: retry.status };
  }

  return { rateLimits: null, status: firstAttempt.status };
}
