"use client";

import { useActionState, useRef, useEffect } from "react";
import { createArtist, type ArtistFormState } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddArtistForm({ clientId }: { clientId: string }) {
  const [state, formAction, pending] = useActionState<ArtistFormState, FormData>(createArtist, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state?.error) {
      formRef.current?.reset();
    }
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex items-end gap-2 border-t border-border pt-4">
      <input type="hidden" name="clientId" value={clientId} />
      <div className="flex-1 space-y-1">
        <label htmlFor="stageName" className="text-xs text-muted-foreground">
          Add artist
        </label>
        <Input id="stageName" name="stageName" placeholder="Stage name" required />
      </div>
      <div className="w-32 space-y-1">
        <label htmlFor="genre" className="text-xs text-muted-foreground">
          Genre
        </label>
        <Input id="genre" name="genre" placeholder="Optional" />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        Add
      </Button>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
