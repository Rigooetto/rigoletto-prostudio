import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CancelLink({ href, children = "Cancel" }: { href: string; children?: React.ReactNode }) {
  return (
    <Button variant="outline" type="button" render={<Link href={href} />} nativeButton={false}>
      {children}
    </Button>
  );
}
