/**
 * Static token authentication utilities
 *
 * Simple utilities for pre-acquired token authentication
 */

/**
 * Creates HTTP headers for static token authentication
 *
 * @param accessToken - The pre-acquired access token
 * @param tokenType - The token type (default: "Bearer")
 * @returns HTTP headers with Authorization header
 *
 * @example
 * ```typescript
 * const headers = createTokenAuthHeaders(process.env.MCP_ACCESS_TOKEN);
 * // { Authorization: 'Bearer eyJ...' }
 * ```
 */
export function createTokenAuthHeaders(
  accessToken: string,
  tokenType: string = 'Bearer'
): Record<string, string> {
  return {
    Authorization: `${tokenType} ${accessToken}`,
  };
}

/**
 * Validates that an access token is present and non-empty
 *
 * @param accessToken - The access token to validate
 * @throws Error if token is missing or empty
 */
export function validateAccessToken(accessToken: string | undefined): void {
  if (!accessToken) {
    throw new Error('Access token is required but was not provided');
  }

  if (accessToken.trim().length === 0) {
    throw new Error('Access token cannot be empty');
  }
}

/**
 * Checks if a token appears to be expired based on common JWT structure
 *
 * Note: This is a best-effort check and may not work for all token formats.
 * For reliable expiration checking, use the token's associated expiration time.
 *
 * @param accessToken - The access token to check
 * @returns true if the token appears to be expired, false otherwise
 */
export function isTokenExpired(accessToken: string): boolean {
  try {
    // Try to decode as JWT
    const parts = accessToken.split('.');
    if (parts.length !== 3) {
      // Not a JWT, can't determine expiration
      return false;
    }

    const payloadPart = parts[1];
    if (!payloadPart) {
      return false;
    }

    const payload = JSON.parse(
      Buffer.from(payloadPart, 'base64url').toString('utf-8')
    ) as Record<string, unknown>;

    if (typeof payload.exp === 'number') {
      // exp is in seconds, Date.now() is in milliseconds
      return payload.exp * 1000 < Date.now();
    }

    return false;
  } catch {
    // If we can't parse the token, assume it's not expired
    return false;
  }
}

/**
 * Checks if a token will expire within the specified buffer time
 *
 * @param expiresAt - Token expiration timestamp in milliseconds
 * @param bufferMs - Buffer time in milliseconds (default: 60000 = 1 minute)
 * @returns true if the token will expire within the buffer time
 */
export function isTokenExpiringSoon(
  expiresAt: number | undefined,
  bufferMs: number = 60000
): boolean {
  if (expiresAt === undefined) {
    return false;
  }

  return expiresAt - bufferMs < Date.now();
}
