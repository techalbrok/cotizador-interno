import { Car, CheckCircle2, Clock3, FileText, HeartPulse, Home, LucideIcon, Store, XCircle } from "lucide-react";
import { InsuranceType, RequestStatus } from "../types";

export type Tone = "primary" | "neutral" | "info" | "success" | "warning" | "danger";

export const insuranceTypeMeta: Record<InsuranceType, { icon: LucideIcon; tone: Tone; description: string }> = {
  Auto: {
    icon: Car,
    tone: "info",
    description: "Turismos, motos y vehiculos de uso diario.",
  },
  Hogar: {
    icon: Home,
    tone: "success",
    description: "Viviendas, contenidos y proteccion familiar.",
  },
  Comercio: {
    icon: Store,
    tone: "warning",
    description: "Locales, negocios y cobertura operativa.",
  },
  "Salud Extranjería": {
    icon: HeartPulse,
    tone: "primary",
    description: "Coberturas medicas para residencia y movilidad.",
  },
};

export const statusMeta: Record<RequestStatus, { tone: Tone; label: string; icon: LucideIcon }> = {
  Borrador: { tone: "neutral", label: "Borrador", icon: FileText },
  Enviada: { tone: "info", label: "Enviada", icon: Clock3 },
  "En gestión": { tone: "warning", label: "En gestion", icon: Clock3 },
  Respondida: { tone: "info", label: "Respondida", icon: CheckCircle2 },
  Emitida: { tone: "success", label: "Emitida", icon: CheckCircle2 },
  Cancelada: { tone: "danger", label: "Cancelada", icon: XCircle },
};

export const toneClasses: Record<Tone, { badge: string; ring: string }> = {
  primary: {
    badge: "bg-[hsl(350_78%_50%_/_0.12)] text-[hsl(350_78%_44%)] border-[hsl(350_78%_50%_/_0.18)]",
    ring: "shadow-[0_18px_34px_-24px_hsl(350_78%_50%_/_0.7)]",
  },
  neutral: {
    badge: "bg-[hsl(219_18%_52%_/_0.12)] text-[hsl(219_18%_38%)] border-[hsl(219_18%_52%_/_0.12)]",
    ring: "shadow-[0_18px_34px_-24px_hsl(219_18%_52%_/_0.4)]",
  },
  info: {
    badge: "bg-[hsl(223_83%_60%_/_0.12)] text-[hsl(223_83%_45%)] border-[hsl(223_83%_60%_/_0.16)]",
    ring: "shadow-[0_18px_34px_-24px_hsl(223_83%_60%_/_0.5)]",
  },
  success: {
    badge: "bg-[hsl(152_58%_42%_/_0.12)] text-[hsl(152_58%_30%)] border-[hsl(152_58%_42%_/_0.18)]",
    ring: "shadow-[0_18px_34px_-24px_hsl(152_58%_42%_/_0.45)]",
  },
  warning: {
    badge: "bg-[hsl(33_90%_55%_/_0.12)] text-[hsl(28_88%_38%)] border-[hsl(33_90%_55%_/_0.2)]",
    ring: "shadow-[0_18px_34px_-24px_hsl(33_90%_55%_/_0.45)]",
  },
  danger: {
    badge: "bg-[hsl(353_83%_60%_/_0.12)] text-[hsl(353_72%_46%)] border-[hsl(353_83%_60%_/_0.2)]",
    ring: "shadow-[0_18px_34px_-24px_hsl(353_83%_60%_/_0.45)]",
  },
};

export const safeText = (value: unknown, fallback = "-") => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : fallback;
  }

  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }

  return String(value);
};
