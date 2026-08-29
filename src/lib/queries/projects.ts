import "server-only";
import { prisma } from "@/lib/db";

export async function listProjects() {
  const projects = await prisma.project.findMany({
    include: {
      client: true,
      artist: true,
      primaryService: true,
      leadEngineer: true,
      tracks: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return projects.map((project) => ({
    ...project,
    deliveredTrackCount: project.tracks.filter((t) => t.status === "DELIVERED").length,
  }));
}

export async function listProjectsForEmployee(employeeId: string) {
  const projects = await listProjects();
  return projects.filter((p) => p.leadEngineerId === employeeId);
}

export async function getProjectDetail(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      artist: true,
      primaryService: true,
      leadEngineer: true,
      tracks: { orderBy: { trackNumber: "asc" } },
      sessions: {
        include: { service: true, payments: { select: { amount: true, amountBase: true } } },
        orderBy: { startsAt: "desc" },
      },
    },
  });
}
