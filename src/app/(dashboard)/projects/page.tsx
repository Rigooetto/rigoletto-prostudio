import Link from "next/link";
import { Plus } from "lucide-react";
import { listProjects } from "@/lib/queries/projects";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/format";

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">{projects.length} projects</p>
        </div>
        <Button render={<Link href="/projects/new" />} nativeButton={false}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Lead Engineer</TableHead>
              <TableHead className="text-right">Tracks</TableHead>
              <TableHead className="text-right">Quoted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No projects yet.
                </TableCell>
              </TableRow>
            )}
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">
                  <Link href={`/projects/${project.id}`} className="hover:underline">
                    {project.title}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{project.client.displayName}</TableCell>
                <TableCell className="text-muted-foreground">{project.primaryService.serviceName}</TableCell>
                <TableCell>
                  <ProjectStatusBadge status={project.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {project.leadEngineer?.displayName ?? project.leadEngineer?.fullName ?? "Unassigned"}
                </TableCell>
                <TableCell className="text-right">
                  {project.deliveredTrackCount}/{project.trackCount}
                </TableCell>
                <TableCell className="text-right">
                  {project.quotedPrice ? formatCurrency(project.quotedPrice) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
