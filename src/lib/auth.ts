import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { RoleCode } from "@/generated/prisma/enums";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const employee = await prisma.employee.findUnique({
          where: { email: email.toLowerCase().trim() },
          include: { role: true },
        });
        if (!employee || !employee.active) return null;

        const passwordMatches = await bcrypt.compare(password, employee.passwordHash);
        if (!passwordMatches) return null;

        return {
          id: employee.id,
          email: employee.email,
          name: employee.displayName ?? employee.fullName,
          roleCode: employee.role.code,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.employeeId = user.id as string;
        token.roleCode = (user as { roleCode: RoleCode }).roleCode;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.employeeId as string;
        session.user.roleCode = token.roleCode as RoleCode;
      }
      return session;
    },
  },
});
