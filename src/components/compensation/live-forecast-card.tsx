import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

type Forecast = {
  basePay: number;
  productionVariable: number;
  mixMasterVariable: number;
  timeBasedVariable: number;
  acquisitionCommission: number;
  revenueBonus: number;
  total: number;
  monthlyStudioRevenue: number;
  confirmedUpcomingRevenue: number;
  projectedMonthEndRevenue: number;
  projectedMonthEndBonus: number;
  nextBonus: { nextTier: { bonusAmount: number }; revenueNeeded: number; additionalBonus: number } | null;
};

export function LiveForecastCard({ forecast, name }: { forecast: Forecast; name: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{name}&apos;s Projected Pay (This Month)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <Row label="Base Pay" value={forecast.basePay} />
          <Row label="Production Variable" value={forecast.productionVariable} />
          <Row label="Mix/Master Variable" value={forecast.mixMasterVariable} />
          <Row label="Time-Based Services" value={forecast.timeBasedVariable} />
          <Row label="New Client Acquisition" value={forecast.acquisitionCommission} />
          <Row label="Revenue Bonus" value={forecast.revenueBonus} />
          <Row label="Earned So Far" value={forecast.total} strong />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-border pt-4 text-sm sm:grid-cols-3">
          <Row label="Current Monthly Revenue" value={forecast.monthlyStudioRevenue} />
          <Row label="Confirmed Upcoming Revenue" value={forecast.confirmedUpcomingRevenue} />
          <Row label="Projected Month-End Revenue" value={forecast.projectedMonthEndRevenue} />
          <Row label="Projected Month-End Bonus" value={forecast.projectedMonthEndBonus} strong />
        </div>

        {forecast.nextBonus && (
          <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
            Only {formatCurrency(forecast.nextBonus.revenueNeeded)} more studio revenue this month unlocks an
            additional {formatCurrency(forecast.nextBonus.additionalBonus)} bonus.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={strong ? "text-lg font-semibold" : "font-medium"}>{formatCurrency(value)}</p>
    </div>
  );
}
