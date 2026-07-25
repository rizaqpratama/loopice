import type { JwtPayload, TenantBranding } from "@loopice/shared";

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantBranding & { isActive: boolean };
      user?: JwtPayload;
    }
  }
}

export {};
