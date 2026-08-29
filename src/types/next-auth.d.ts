import type { DefaultSession } from "next-auth";
import type { RoleCode } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    roleCode: RoleCode;
  }

  interface Session {
    user: {
      id: string;
      roleCode: RoleCode;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    employeeId: string;
    roleCode: RoleCode;
  }
}
