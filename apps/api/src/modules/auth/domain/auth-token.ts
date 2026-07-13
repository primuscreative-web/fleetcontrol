export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  rememberMe?: boolean;
}

export interface AuthenticatedPrincipal {
  userId: string;
  companyId: string;
  role: string;
}
