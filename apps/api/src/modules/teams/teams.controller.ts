import type { Request, Response } from "express";
import { BadRequestError } from "../../lib/httpError";
import * as teamsService from "./teams.service";
import { addTeamMemberSchema, createTeamSchema, updateTeamSchema } from "./teams.schema";

function tenantId(req: Request): string {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  return req.tenant.id;
}

export async function list(req: Request, res: Response) {
  const { search } = req.query;
  res.json(await teamsService.listTeams(tenantId(req), typeof search === "string" ? search : undefined));
}

export async function create(req: Request, res: Response) {
  const input = createTeamSchema.parse(req.body);
  res.status(201).json(await teamsService.createTeam(tenantId(req), input));
}

export async function get(req: Request, res: Response) {
  res.json(await teamsService.getTeam(tenantId(req), req.params.id));
}

export async function update(req: Request, res: Response) {
  const input = updateTeamSchema.parse(req.body);
  res.json(await teamsService.updateTeam(tenantId(req), req.params.id, input));
}

export async function deactivate(req: Request, res: Response) {
  res.json(await teamsService.deactivateTeam(tenantId(req), req.params.id));
}

export async function addMember(req: Request, res: Response) {
  const { userId } = addTeamMemberSchema.parse(req.body);
  res.status(201).json(await teamsService.addTeamMember(tenantId(req), req.params.teamId, userId));
}

export async function removeMember(req: Request, res: Response) {
  res.json(await teamsService.removeTeamMember(tenantId(req), req.params.teamId, req.params.userId));
}
