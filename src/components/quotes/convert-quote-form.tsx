"use client";

import { useActionState } from "react";
import { convertQuoteToProject, type ConvertQuoteState } from "@/lib/actions/quotes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConvertQuoteForm({ quoteId, defaultTitle }: { quoteId: string; defaultTitle: string }) {
  const action = convertQuoteToProject.bind(null, quoteId);
  const [state, formAction, pending] = useActionState<ConvertQuoteState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium">Convert to Project</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="title" className="text-xs">Project Title</Label>
          <Input id="title" name="title" defaultValue={defaultTitle} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="trackCount" className="text-xs">Track Count</Label>
          <Input id="trackCount" name="trackCount" type="number" min="1" defaultValue={1} required />
        </div>
      </div>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Creating..." : "Create Project from Quote"}
      </Button>
    </form>
  );
}
