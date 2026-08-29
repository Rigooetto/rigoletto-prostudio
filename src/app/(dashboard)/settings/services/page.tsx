import { requireRole } from "@/lib/auth/session";
import { listServices } from "@/lib/queries/services";
import { ServiceDialog } from "@/components/settings/service-dialog";
import { toPlainService } from "@/lib/serialize";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";

const billingTypeLabels: Record<string, string> = {
  PER_SONG: "Per Song",
  PER_HOUR: "Per Hour",
  PER_DAY: "Per Day",
  FIXED_PROJECT: "Fixed Project",
  CUSTOM: "Custom",
};

const compensationSummary = (type: string, value: unknown) => {
  if (type === "NONE") return "—";
  if (type === "FIXED_AMOUNT") return `${formatCurrency(Number(value ?? 0))} / delivered`;
  if (type === "PERCENT_REVENUE") return `${Number(value ?? 0)}% of revenue`;
  if (type === "TIERED_PRODUCTION") return "Tiered (Phase 4)";
  return "Custom";
};

export default async function ServicesSettingsPage() {
  await requireRole("ADMIN");
  const services = await listServices();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
          <p className="text-sm text-muted-foreground">
            Pricing and compensation rules used across projects and sessions. Admin-only.
          </p>
        </div>
        <ServiceDialog />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead className="text-right">Default Price</TableHead>
              <TableHead>Compensation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell>
                  <p className="font-medium">{service.serviceName}</p>
                  {service.serviceCategory && (
                    <p className="text-xs text-muted-foreground">{service.serviceCategory}</p>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{billingTypeLabels[service.billingType]}</TableCell>
                <TableCell className="text-right">{formatCurrency(service.defaultPrice)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {compensationSummary(service.compensationType, service.compensationValue)}
                </TableCell>
                <TableCell>
                  <Badge variant={service.active ? "default" : "secondary"}>
                    {service.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ServiceDialog service={toPlainService(service)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
