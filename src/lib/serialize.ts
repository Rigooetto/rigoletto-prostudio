import type { Service, Employee, Lead, ProductionTier, RevenueBonusTier, Expense, Session } from "@/generated/prisma/client";

// Prisma's Decimal is a class instance and cannot cross the Server -> Client
// Component boundary. These helpers convert Decimal fields to plain numbers
// right before handing data to "use client" components.
//
// Every converter below builds its return object field-by-field rather than
// spreading (`...model`) — callers routinely pass in a query result that
// `include`s a relation (e.g. Expense.createdByEmployee), and a spread would
// carry that extra runtime property straight through even though the Plain*
// type doesn't declare it, silently breaking serialization again.

export type PlainService = Omit<Service, "defaultPrice" | "compensationValue"> & {
  defaultPrice: number;
  compensationValue: number | null;
};

export function toPlainService(service: Service): PlainService {
  return {
    id: service.id,
    serviceName: service.serviceName,
    serviceCategory: service.serviceCategory,
    billingType: service.billingType,
    defaultPrice: Number(service.defaultPrice),
    currency: service.currency,
    defaultDurationMinutes: service.defaultDurationMinutes,
    compensationType: service.compensationType,
    compensationValue: service.compensationValue === null ? null : Number(service.compensationValue),
    active: service.active,
    sortOrder: service.sortOrder,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}

export type PlainEmployee = Omit<Employee, "basePayWeekly" | "acquisitionCommissionPercent"> & {
  basePayWeekly: number | null;
  acquisitionCommissionPercent: number | null;
};

export function toPlainEmployee(employee: Employee): PlainEmployee {
  return {
    id: employee.id,
    email: employee.email,
    passwordHash: employee.passwordHash,
    roleId: employee.roleId,
    fullName: employee.fullName,
    displayName: employee.displayName,
    phone: employee.phone,
    active: employee.active,
    hireDate: employee.hireDate,
    basePayWeekly: employee.basePayWeekly === null ? null : Number(employee.basePayWeekly),
    acquisitionCommissionPercent:
      employee.acquisitionCommissionPercent === null ? null : Number(employee.acquisitionCommissionPercent),
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}

export type PlainLead = Omit<Lead, "estimatedValue"> & { estimatedValue: number | null };

export function toPlainLead(lead: Lead): PlainLead {
  return {
    id: lead.id,
    name: lead.name,
    artistName: lead.artistName,
    phone: lead.phone,
    email: lead.email,
    instagramHandle: lead.instagramHandle,
    leadSourceId: lead.leadSourceId,
    interestedServiceId: lead.interestedServiceId,
    stage: lead.stage,
    estimatedValue: lead.estimatedValue === null ? null : Number(lead.estimatedValue),
    probability: lead.probability,
    nextFollowUpAt: lead.nextFollowUpAt,
    firstContactedAt: lead.firstContactedAt,
    lastContactedAt: lead.lastContactedAt,
    notes: lead.notes,
    ownerEmployeeId: lead.ownerEmployeeId,
    convertedClientId: lead.convertedClientId,
    campaignId: lead.campaignId,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

export type PlainProductionTier = Omit<ProductionTier, "amountPerSong"> & { amountPerSong: number };

export function toPlainProductionTier(tier: ProductionTier): PlainProductionTier {
  return {
    id: tier.id,
    songsFrom: tier.songsFrom,
    songsTo: tier.songsTo,
    amountPerSong: Number(tier.amountPerSong),
    sortOrder: tier.sortOrder,
    active: tier.active,
    effectiveFrom: tier.effectiveFrom,
    effectiveTo: tier.effectiveTo,
    createdAt: tier.createdAt,
  };
}

export type PlainRevenueBonusTier = Omit<RevenueBonusTier, "revenueFrom" | "revenueTo" | "bonusAmount"> & {
  revenueFrom: number;
  revenueTo: number | null;
  bonusAmount: number;
};

export function toPlainRevenueBonusTier(tier: RevenueBonusTier): PlainRevenueBonusTier {
  return {
    id: tier.id,
    revenueFrom: Number(tier.revenueFrom),
    revenueTo: tier.revenueTo === null ? null : Number(tier.revenueTo),
    bonusAmount: Number(tier.bonusAmount),
    sortOrder: tier.sortOrder,
    active: tier.active,
    effectiveFrom: tier.effectiveFrom,
    effectiveTo: tier.effectiveTo,
    createdAt: tier.createdAt,
  };
}

// Narrow view for the calendar's client-rendered week/day grid — only what a
// session block actually displays, not the full Prisma result (which also
// carries Decimal fields and can't cross the Server -> Client boundary).
export type PlainCalendarSession = Pick<Session, "id" | "startsAt" | "endsAt" | "studioRoom" | "paymentStatus"> & {
  amount: number;
  clientDisplayName: string;
  serviceName: string;
};

export function toPlainCalendarSession(
  session: Session & { client: { displayName: string }; service: { serviceName: string } }
): PlainCalendarSession {
  return {
    id: session.id,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    studioRoom: session.studioRoom,
    paymentStatus: session.paymentStatus,
    amount: Number(session.amountBase ?? session.amount),
    clientDisplayName: session.client.displayName,
    serviceName: session.service.serviceName,
  };
}

export type PlainExpense = Omit<Expense, "amount" | "exchangeRate" | "amountBase"> & {
  amount: number;
  exchangeRate: number;
  amountBase: number | null;
};

export function toPlainExpense(expense: Expense): PlainExpense {
  return {
    id: expense.id,
    date: expense.date,
    vendor: expense.vendor,
    description: expense.description,
    category: expense.category,
    amount: Number(expense.amount),
    currency: expense.currency,
    exchangeRate: Number(expense.exchangeRate),
    amountBase: expense.amountBase === null ? null : Number(expense.amountBase),
    recurring: expense.recurring,
    notes: expense.notes,
    receiptUrl: expense.receiptUrl,
    createdByEmployeeId: expense.createdByEmployeeId,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}
