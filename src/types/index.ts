export interface TokenData {
  id_token: string;
  access_token: string;
  refresh_token: string;
  account_id: string;
}

export interface AuthData {
  OPENAI_API_KEY: string | null;
  tokens: TokenData;
  last_refresh: string;
}

export interface RateLimits {
  primary: {
    used_percent: number;
    window_minutes: number;
    resets_at: number;
  };
  secondary: {
    used_percent: number;
    window_minutes: number;
    resets_at: number;
  };
  credits: {
    has_credits: boolean;
    unlimited: boolean;
    balance: string | null;
  };
  plan_type: string;
}

export interface Metadata {
  rate_limits: RateLimits;
  last_updated: number;
}

export interface AccountData {
  auth: AuthData;
  metadata: Metadata;
}

export interface AuthsData {
  [email: string]: AccountData;
}

export interface JWTPayload {
  email: string;
  [key: string]: any;
}

// API Response Types
export interface RateLimitWindowSnapshot {
  used_percent: number;
  limit_window_seconds: number;
  reset_after_seconds: number;
  reset_at: number;
}

export interface CreditStatusDetails {
  has_credits: boolean;
  unlimited: boolean;
  balance?: string | null;
}

export interface RateLimitStatusPayload {
  plan_type: string;
  rate_limit?: {
    primary_window?: RateLimitWindowSnapshot | null;
    secondary_window?: RateLimitWindowSnapshot | null;
  } | null;
  credits?: CreditStatusDetails | null;
}

export interface RefreshTokenResponse {
  id_token?: string;
  access_token?: string;
  refresh_token?: string;
}
