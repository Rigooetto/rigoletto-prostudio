import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatTime } from "@/lib/format";
import type { Session, Client, Service, SessionEngineer, Employee } from "@/generated/prisma/client";

type SessionRow = Session & {
  client: Client;
  service: Service;
  engineers: (SessionEngineer & { employee: Employee })[];
};

export function TodaysSessionsCard({ sessions }: { sessions: SessionRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Today&apos;s Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions booked today.</p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((session) => (
              <li key={session.id} className="flex items-center justify-between border-b border-border/60 pb-3 text-sm last:border-0 last:pb-0">
                <div>
                  <p className="font-medium">{session.client.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.service.serviceName} · {session.studioRoom}
                    {session.engineers.length > 0 &&
                      ` · ${session.engineers.map((e) => e.employee.displayName ?? e.employee.fullName).join(", ")}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {formatTime(session.startsAt)}–{formatTime(session.endsAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(session.amount)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
