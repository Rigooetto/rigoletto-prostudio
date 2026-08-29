import { requireRole } from "@/lib/auth/session";
import { getActiveTiers } from "@/lib/queries/compensation";
import { listServices } from "@/lib/queries/services";
import { listActiveEmployees } from "@/lib/queries/employees";
import {
  ProductionTierEditDialog,
  RevenueBonusTierEditDialog,
  ServiceCompensationEditDialog,
  EmployeeCompensationEditDialog,
} from "@/components/settings/tier-edit-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { toPlainProductionTier, toPlainRevenueBonusTier, toPlainService, toPlainEmployee } from "@/lib/serialize";

export default async function CompensationTiersPage() {
  await requireRole("ADMIN");
  const [{ productionTiers, revenueBonusTiers }, services, employees] = await Promise.all([
    getActiveTiers(),
    listServices({ activeOnly: true }),
    listActiveEmployees(),
  ]);
  // TIERED_PRODUCTION's rate is entirely the Per-Song Tiers table above —
  // nothing to show here for it. NONE/CUSTOM have no single rate to edit.
  const perServiceRateServices = services.filter(
    (s) => s.compensationType === "FIXED_AMOUNT" || s.compensationType === "PERCENT_REVENUE"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compensation Tiers</h1>
        <p className="text-sm text-muted-foreground">
          The thresholds behind the compensation engine. Editable here — never hardcoded. Admin-only.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Full Production — Per-Song Tiers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Songs</TableHead>
                <TableHead className="text-right">Amount / Song</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {productionTiers.map((tier) => (
                <TableRow key={tier.id}>
                  <TableCell>{tier.songsFrom}–{tier.songsTo ?? "+"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(tier.amountPerSong)}</TableCell>
                  <TableCell>
                    <ProductionTierEditDialog tier={toPlainProductionTier(tier)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Revenue Bonus Tiers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Studio Revenue</TableHead>
                <TableHead className="text-right">Bonus</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenueBonusTiers.map((tier) => (
                <TableRow key={tier.id}>
                  <TableCell>
                    {formatCurrency(tier.revenueFrom)}–{tier.revenueTo ? formatCurrency(tier.revenueTo) : "+"}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(tier.bonusAmount)}</TableCell>
                  <TableCell>
                    <RevenueBonusTierEditDialog tier={toPlainRevenueBonusTier(tier)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-Service Compensation Rates</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Pays</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {perServiceRateServices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No services with a per-service compensation rate.
                  </TableCell>
                </TableRow>
              )}
              {perServiceRateServices.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.serviceName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {service.compensationType === "PERCENT_REVENUE" ? "% of session revenue" : "$ per delivered track"}
                  </TableCell>
                  <TableCell className="text-right">
                    {service.compensationType === "PERCENT_REVENUE"
                      ? `${Number(service.compensationValue ?? 0)}%`
                      : formatCurrency(service.compensationValue ?? 0)}
                  </TableCell>
                  <TableCell>
                    <ServiceCompensationEditDialog service={toPlainService(service)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employee Base Pay &amp; Commission</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Base Pay / Week</TableHead>
                <TableHead className="text-right">Acquisition Commission</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No active employees.
                  </TableCell>
                </TableRow>
              )}
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.displayName ?? employee.fullName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(employee.basePayWeekly ?? 0)}</TableCell>
                  <TableCell className="text-right">{Number(employee.acquisitionCommissionPercent ?? 0)}%</TableCell>
                  <TableCell>
                    <EmployeeCompensationEditDialog employee={toPlainEmployee(employee)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
