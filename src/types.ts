export type RequestStatus = "Borrador" | "Enviada" | "En gestión" | "Respondida" | "Emitida" | "Cancelada";

export type InsuranceType = "Auto" | "Hogar" | "Comercio" | "Salud Extranjería";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  text: string;
  createdAt: string;
}

export interface InsuranceRequest {
  id: string;
  branch: string;
  type: InsuranceType;
  clientName: string;
  status: RequestStatus;
  createdAt: string;
  data: Record<string, any>;
  attachments: Attachment[];
  comments: Comment[];
}

export type FormFieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "textarea"
  | "email"
  | "tel"
  | "checkbox"
  | "checkboxGroup"
  | "section"
  | "info";

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: FormFieldOption[];
  span?: 3 | 4 | 6 | 12;
  helpText?: string;
}

export interface FormSchema {
  type: InsuranceType;
  title: string;
  fields: FormField[];
}
