"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { LiveNotification } from "@/lib/queries/notifications";

export function NotificationBell({ notifications }: { notifications: LiveNotification[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            {notifications.length > 0 && (
              <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-destructive" />
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Needs Attention</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {notifications.length === 0 && (
            <div className="px-2 py-3 text-center text-sm text-muted-foreground">You&apos;re all caught up.</div>
          )}
          {notifications.map((n) => (
            <DropdownMenuItem key={n.id} render={<Link href={n.link} />} className="p-0">
              <span className="block w-full px-2 py-1.5 text-sm">{n.message}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
