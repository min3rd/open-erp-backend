import { UserContext } from '../permissions.guard';

/**
 * Interface for token resolution strategies
 * Allows microservices to plug custom token verification logic
 */
export interface ITokenResolver {
  /**
   * Resolve and verify a token string to extract user information
   * @param token - JWT or other token string to resolve
   * @returns User context or null if token is invalid
   */
  resolveToken(token: string): Promise<UserContext | null>;
}

/**
 * Interface for user resolution strategies
 * Allows microservices to fetch user information via RPC or other means
 */
export interface IUserResolver {
  /**
   * Resolve user information from a user ID
   * @param userId - User identifier
   * @returns User context or null if user not found
   */
  resolveUser(userId: string): Promise<UserContext | null>;

  /**
   * Resolve user information from a token via RPC call
   * @param token - Token to resolve
   * @returns User context or null if token is invalid
   */
  resolveUserFromToken(token: string): Promise<UserContext | null>;
}
