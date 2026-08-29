"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isAuthError =
    error.message.includes("Not authorized") ||
    error.message.includes("You can only modify") ||
    error.message.includes("You can't reassign");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <ShieldAlert className="h-10 w-10 text-muted-foreground" />
      <div>
        <h1 className="text-xl font-semibold">{isAuthError ? "You don't have access to this page" : "Something went wrong"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAuthError
            ? "This section is restricted. If you think that's wrong, check with an Admin."
            : "An unexpected error occurred. Try again, or head back to the dashboard."}
        </p>
      </div>
      <Button render={<Link href="/dashboard" />} nativeButton={false}>
        Back to Dashboard
      </Button>
    </div>
  );
}
