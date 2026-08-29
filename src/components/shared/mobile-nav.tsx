"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavLinks } from "@/components/shared/nav-links";
import type { RoleCode } from "@/generated/prisma/enums";

export function MobileNav({ roleCode }: { roleCode: RoleCode }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        }
      />
      <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
        <SheetHeader className="flex items-center justify-center border-b border-sidebar-border px-4 py-4">
          <SheetTitle className="sr-only">Rigoletto ProStudio</SheetTitle>
          <Image
            src="/RigolettoProStudioLogo2026.png"
            alt="Rigoletto ProStudio"
            width={1536}
            height={1024}
            className="h-14 w-auto"
          />
        </SheetHeader>
        <NavLinks roleCode={roleCode} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
