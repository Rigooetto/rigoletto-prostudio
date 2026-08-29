import { notFound } from "next/navigation";
import { requireEmployee } from "@/lib/auth/session";
import { getCompensationPeriodDetail } from "@/lib/queries/compensation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PeriodActions } from "@/components/compensation/period-actions";
import { AdjustmentForm } from "@/components/compensation/adjustment-form";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function CompensationPeriodPage({ params }: PageProps<"/compensation/[periodId]">) {
  const { periodId } = await params;
  const [employee, period] = await Promise.all([requireEmployee(), getCompensationPeriodDetail(periodId)]);
  if (!period) notFound();

  const isAdmin = employee.role.code === "ADMIN";
  if (!isAdmin && period.employeeId !== employee.id) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {period.employee.displayName ?? period.employee.fullName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(period.periodStart)} – {formatDate(period.periodEnd)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={period.status === "PAID" ? "default" : "outline"}>{period.status}</Badge>
          {isAdmin && <PeriodActions periodId={period.id} status={period.status} />}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Base Pay" value={formatCurrency(period.basePay)} />
          <Row label="Production Variable" value={formatCurrency(period.productionVariable)} />
          <Row label="Mix/Master Variable" value={formatCurrency(period.mixMasterVariable)} />
          <Row label="Time-Based Services" value={formatCurrency(period.timeBasedVariable)} />
          <Row label="Customer Acquisition Commission" value={formatCurrency(period.acquisitionCommission)} />
          <Row label="Revenue Bonus" value={formatCurrency(period.revenueBonus)} />
          <Row label="Adjustments" value={formatCurrency(period.adjustments)} />
          <div className="flex items-center justify-between pt-2">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-semibold">{formatCurrency(period.total)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calculation Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <Row label="Studio Revenue That Month" value={formatCurrency(period.monthlyRevenueSnapshot ?? 0)} />
          <Row label="Songs Delivered" value={String(period.deliveredSongsSnapshot ?? 0)} />
          <Row label="Mix/Masters Delivered" value={String(period.mixMasterCountSnapshot ?? 0)} />
        </CardContent>
      </Card>

      {isAdmin && period.status !== "PAID" && (
        <AdjustmentForm periodId={period.id} adjustments={Number(period.adjustments)} adjustmentNotes={period.adjustmentNotes} />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
