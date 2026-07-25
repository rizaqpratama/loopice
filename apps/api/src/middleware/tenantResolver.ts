import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { NotFoundError } from "../lib/httpError";
import { env, isProduction } from "../config/env";

function extractSubdomainCandidate(req: Request): string | null {
  if (!isProduction) {
    const headerValue = req.header("X-Tenant-Subdomain");
    if (headerValue) return headerValue.toLowerCase();

    const queryValue = req.query.tenant;
    if (typeof queryValue === "string" && queryValue.length > 0) {
      return queryValue.toLowerCase();
    }
  }

  const host = req.hostname; // express strips port already
  if (!host || host === env.ROOT_DOMAIN) return null;

  const suffix = `.${env.ROOT_DOMAIN}`;
  if (host.endsWith(suffix)) {
    return host.slice(0, -suffix.length).toLowerCase();
  }

  // Fallback: leftmost label of any host (covers production domains that
  // don't equal ROOT_DOMAIN, e.g. acme.yourapp.com when ROOT_DOMAIN=yourapp.com
  // was set without the leading dot, or custom domains).
  const parts = host.split(".");
  if (parts.length > 2) return parts[0].toLowerCase();

  return null;
}

export async function tenantResolver(req: Request, _res: Response, next: NextFunction) {
  try {
    const subdomain = extractSubdomainCandidate(req);
    if (!subdomain) {
      throw new NotFoundError("Tenant could not be resolved from this request");
    }

    const tenant = await prisma.tenant.findUnique({ where: { subdomain } });
    if (!tenant || !tenant.isActive) {
      throw new NotFoundError(`Tenant "${subdomain}" not found`);
    }

    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      isActive: tenant.isActive,
    };
    next();
  } catch (err) {
    next(err);
  }
}
