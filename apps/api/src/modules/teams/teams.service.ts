import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/httpError";
import { SAFE_USER_SELECT } from "../../lib/safeUserSelect";

const TEAM_INCLUDE = {
  leader: { select: SAFE_USER_SELECT },
  members: { include: { user: { select: SAFE_USER_SELECT } } },
} satisfies Prisma.TeamInclude;

export async function listTeams(tenantId: string, search?: string) {
  return prisma.team.findMany({
    where: {
      tenantId,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: TEAM_INCLUDE,
    orderBy: { name: "asc" },
  });
}

export interface TeamInput {
  name: string;
  description?: string;
  leaderId?: string;
}

async function assertLeaderInTenant(tenantId: string, leaderId: string) {
  const user = await prisma.user.findFirst({ where: { id: leaderId, tenantId } });
  if (!user) throw new BadRequestError("Leader does not belong to this tenant");
}

async function assertNameAvailable(tenantId: string, name: string, excludeId?: string) {
  const existing = await prisma.team.findUnique({ where: { tenantId_name: { tenantId, name } } });
  if (existing && existing.id !== excludeId) {
    throw new ConflictError("A team with this name already exists in this tenant");
  }
}

export async function createTeam(tenantId: string, input: TeamInput) {
  await assertNameAvailable(tenantId, input.name);
  if (input.leaderId) await assertLeaderInTenant(tenantId, input.leaderId);
  return prisma.team.create({
    data: { tenantId, name: input.name, description: input.description, leaderId: input.leaderId },
    include: TEAM_INCLUDE,
  });
}

async function findScoped(tenantId: string, id: string) {
  const team = await prisma.team.findFirst({ where: { id, tenantId }, include: TEAM_INCLUDE });
  if (!team) throw new NotFoundError("Team not found");
  return team;
}

export async function getTeam(tenantId: string, id: string) {
  return findScoped(tenantId, id);
}

export interface UpdateTeamInput extends Partial<TeamInput> {
  isActive?: boolean;
}

export async function updateTeam(tenantId: string, id: string, input: UpdateTeamInput) {
  await findScoped(tenantId, id);
  if (input.name) await assertNameAvailable(tenantId, input.name, id);
  if (input.leaderId) await assertLeaderInTenant(tenantId, input.leaderId);
  return prisma.team.update({ where: { id }, data: input, include: TEAM_INCLUDE });
}

export async function deactivateTeam(tenantId: string, id: string) {
  await findScoped(tenantId, id);
  return prisma.team.update({ where: { id }, data: { isActive: false }, include: TEAM_INCLUDE });
}

export async function addTeamMember(tenantId: string, teamId: string, userId: string) {
  await findScoped(tenantId, teamId);
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!user) throw new BadRequestError("User does not belong to this tenant");
  try {
    await prisma.teamMember.create({ data: { teamId, userId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError("This user is already a member of the team");
    }
    throw err;
  }
  return findScoped(tenantId, teamId);
}

export async function removeTeamMember(tenantId: string, teamId: string, userId: string) {
  await findScoped(tenantId, teamId);
  await prisma.teamMember.deleteMany({ where: { teamId, userId } });
  return findScoped(tenantId, teamId);
}
