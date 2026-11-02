/**
 * ServiceAuthGuard verifies JWT service tokens for MCP and HTTP endpoints.
 * Reads the audience from route metadata (handler or class level) via Reflector.
 * Attaches verified claims to request.user for downstream reuse.
 * Throws UnauthorizedException on missing or invalid tokens.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { verifyToken, ServiceClaims } from "@nova/contracts";

function getServiceJwtSecret(): string {
  return process.env.NOVA_SERVICE_JWT_SECRET ?? "test-secret-key-32-bytes-minimum!!";
}

function getServiceJwtIssuer(): string {
  return process.env.NOVA_SERVICE_JWT_ISSUER ?? "test-issuer";
}

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid authorization header");
    }

    const token = authHeader.slice(7);
    const audience = this.reflector.getAllAndOverride<string>("audience", [
      context.getHandler(),
      context.getClass(),
    ]) ?? "policy-service";

    const nowSeconds = Math.floor(Date.now() / 1000);
    const result = verifyToken(token, getServiceJwtSecret(), {
      issuer: getServiceJwtIssuer(),
      audience,
    }, nowSeconds);

    if (!result.ok) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    request.user = result.claims;
    return true;
  }
}
