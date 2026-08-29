import { cn } from "@/lib/utils";
import type { ProjectStatus, TrackStatus, PaymentStatus, WhatsappMessageStatus } from "@/generated/prisma/enums";

type Tone = "neutral" | "info" | "warning" | "success" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  info: "bg-primary/15 text-primary border-transparent",
  warning: "bg-warning/20 text-warning border-transparent",
  success: "bg-success/20 text-success border-transparent",
  danger: "bg-destructive/15 text-destructive border-transparent",
};

const projectStatusTone: Record<ProjectStatus, Tone> = {
  LEAD: "neutral",
  QUOTED: "neutral",
  BOOKED: "info",
  RECORDING: "warning",
  EDITING: "warning",
  MIXING: "warning",
  MASTERING: "warning",
  CLIENT_REVIEW: "warning",
  REVISION: "warning",
  READY_TO_DELIVER: "info",
  DELIVERED: "success",
  PAID: "success",
  CANCELLED: "danger",
  ON_HOLD: "danger",
};

const trackStatusTone: Record<TrackStatus, Tone> = {
  PENDING: "neutral",
  RECORDING: "warning",
  RECORDED: "warning",
  EDITING: "warning",
  EDITED: "info",
  MIXING: "warning",
  MIXED: "info",
  MASTERING: "warning",
  MASTERED: "info",
  DELIVERED: "success",
  REVISION_REQUESTED: "danger",
};

const paymentStatusTone: Record<PaymentStatus, Tone> = {
  UNPAID: "danger",
  PARTIAL: "warning",
  PAID: "success",
  REFUNDED: "neutral",
};

const whatsappStatusTone: Record<WhatsappMessageStatus, Tone> = {
  NOT_SENT: "neutral",
  SENT: "success",
  FAILED: "danger",
  SKIPPED: "neutral",
};

const labelOverrides: Partial<Record<string, string>> = {
  CLIENT_REVIEW: "Client Review",
  READY_TO_DELIVER: "Ready to Deliver",
  ON_HOLD: "On Hold",
  REVISION_REQUESTED: "Revision Requested",
  NOT_SENT: "WhatsApp Not Sent",
  SENT: "WhatsApp Sent",
  FAILED: "WhatsApp Failed",
  SKIPPED: "WhatsApp Skipped",
};

function toLabel(status: string) {
  return labelOverrides[status] ?? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
}

function BadgeBase({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClasses[tone]
      )}
    >
      {children}
    </span>
  );
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <BadgeBase tone={projectStatusTone[status]}>{toLabel(status)}</BadgeBase>;
}

export function TrackStatusBadge({ status }: { status: TrackStatus }) {
  return <BadgeBase tone={trackStatusTone[status]}>{toLabel(status)}</BadgeBase>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <BadgeBase tone={paymentStatusTone[status]}>{toLabel(status)}</BadgeBase>;
}

export function WhatsappStatusBadge({ status }: { status: WhatsappMessageStatus }) {
  return <BadgeBase tone={whatsappStatusTone[status]}>{toLabel(status)}</BadgeBase>;
}
