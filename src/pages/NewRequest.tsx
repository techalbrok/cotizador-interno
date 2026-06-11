import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Loader2, Paperclip, Send, ShieldCheck, Sparkles, UploadCloud, XCircle } from "lucide-react";
import { clsx } from "clsx";
import { FormField, FormSchema, InsuranceType } from "../types";
import { useAuth } from "../context/AuthContext";
import { formSchemas as fallbackFormSchemas } from "../data/formSchemas";
import { apiFetch } from "../lib/api";
import { insuranceTypeMeta } from "../lib/ui";
import AppButton from "../components/ui/AppButton";
import EmptyState from "../components/ui/EmptyState";
import FormSection from "../components/ui/FormSection";
import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import SurfaceCard from "../components/ui/SurfaceCard";

type FieldSection = { title: string; fields: FormField[] };

const stepLabels = ["Ramo", "Poliza actual", "Datos", "Adjuntos"];

export default function NewRequest() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialType = searchParams.get("type") as InsuranceType | null;
  const editId = searchParams.get("editId");

  const [step, setStep] = useState(initialType ? 2 : 1);
  const [type, setType] = useState<InsuranceType | null>(initialType);
  const [schema, setSchema] = useState<FormSchema | null>(initialType ? fallbackFormSchemas[initialType] : null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [clientName, setClientName] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(Boolean(editId));
  const [submitError, setSubmitError] = useState("");
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  useEffect(() => {
    if (!editId || !token) return;
    apiFetch(`/api/solicitudes/${editId}`, token)
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || "No se pudo cargar el borrador");
        }
        return response.json();
      })
      .then((data) => {
        setType(data.ramo as InsuranceType);
        setClientName(String(data.datos_formulario?.nombre_cliente || ""));
        setFormData(data.datos_formulario || {});
        setObservaciones(data.observaciones || "");
        setStep(3);
      })
      .catch((error) => {
        console.error("Error loading draft", error);
        setSubmitError(error.message || "No se pudo cargar el borrador");
      })
      .finally(() => setIsLoadingDraft(false));
  }, [editId, token]);

  useEffect(() => {
    if (!type || !token) return;
    let cancelled = false;
    apiFetch(`/api/formularios/${encodeURIComponent(type)}`, token)
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || "No se pudo cargar el formulario");
        }
        return response.json();
      })
      .then((data: FormSchema) => {
        if (!cancelled) setSchema(data);
      })
      .catch((error) => {
        console.error("Error loading form schema", error);
        if (!cancelled) setSchema(fallbackFormSchemas[type]);
      });
    return () => {
      cancelled = true;
    };
  }, [type, token]);

  const groupedFields = useMemo<FieldSection[]>(() => {
    if (!schema) return [];
    const sections: FieldSection[] = [{ title: "Datos principales", fields: [] }];
    schema.fields.forEach((field) => {
      if (field.type === "section") {
        sections.push({ title: field.label, fields: [] });
        return;
      }
      sections[sections.length - 1].fields.push(field);
    });
    return sections.filter((section) => section.fields.length > 0);
  }, [schema]);

  const normalizeExtractedData = (selectedType: InsuranceType | null, extractedData: Record<string, unknown>) => {
    if (selectedType === "Hogar") {
      return { ...extractedData, tomador: extractedData.nombre || extractedData.tomador || "" };
    }
    return extractedData;
  };

  const handleTypeSelect = (selectedType: InsuranceType) => {
    setType(selectedType);
    setCurrentSectionIndex(0);
    setStep(2);
  };

  const handleExtract = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", event.target.files[0]);
      if (type) formData.append("type", type);
      
      const response = await apiFetch("/api/extract", token, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        const normalizedData = normalizeExtractedData(type, data.data);
        setFormData((previous) => ({ ...previous, ...normalizedData }));
        if (data.data.conductor) setClientName(String(data.data.conductor));
        if (data.data.nombre) setClientName(String(data.data.nombre));
      }
    } catch (error) {
      console.error("Extraction error", error);
    } finally {
      setIsExtracting(false);
      setStep(3);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((previous) => ({ ...previous, [name]: checked }));
  };

  const handleCheckboxGroupChange = (name: string, value: string, checked: boolean) => {
    setFormData((previous) => {
      const currentValues = Array.isArray(previous[name]) ? (previous[name] as string[]) : [];
      if (checked) return { ...previous, [name]: [...new Set([...currentValues, value])] };
      return { ...previous, [name]: currentValues.filter((currentValue) => currentValue !== value) };
    });
  };

  const handleCopyData = (sourcePrefix: string, targetPrefix: string) => {
    setFormData((prev) => {
      const newData = { ...prev };
      Object.keys(newData).forEach((key) => {
        if (key.startsWith(`${sourcePrefix}_`)) {
          const suffix = key.replace(`${sourcePrefix}_`, "");
          newData[`${targetPrefix}_${suffix}`] = newData[key];
        }
      });
      return newData;
    });
  };

  const handleSubmit = async (event: React.FormEvent, isDraft = false) => {
    event.preventDefault();
    setSubmitError("");
    setIsSubmitting(true);
    try {
      if (!token) throw new Error("La sesion no es valida. Vuelve a iniciar sesion.");
      if (!type) throw new Error("Selecciona un ramo antes de continuar.");
      const payload = { ramo: type, datos_formulario: { ...formData, nombre_cliente: clientName }, observaciones };
      const requestUrl = editId ? `/api/solicitudes/${editId}` : "/api/solicitudes";
      const requestMethod = editId ? "PUT" : "POST";
      const response = await apiFetch(requestUrl, token, {
        method: requestMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const savedRequest = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(savedRequest.message || "No se pudo guardar la solicitud");
      const solicitudId = editId || savedRequest.id;
      if (!solicitudId) throw new Error("No se pudo identificar la solicitud guardada");
      if (attachments.length > 0) {
        const uploadFormData = new FormData();
        attachments.forEach((file) => uploadFormData.append("archivos", file));
        const uploadResponse = await apiFetch(`/api/solicitudes/${solicitudId}/adjuntos`, token, { method: "POST", body: uploadFormData });
        const uploadData = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok) throw new Error(uploadData.message || "No se pudieron subir los adjuntos");
      }
      if (!isDraft) {
        const sendResponse = await apiFetch(`/api/solicitudes/${solicitudId}/enviar`, token, { method: "POST" });
        const sendData = await sendResponse.json().catch(() => ({}));
        if (!sendResponse.ok) throw new Error(sendData.message || "No se pudo enviar la solicitud");
      }
      navigate(`/request/${solicitudId}`);
    } catch (error) {
      console.error("Error submitting", error);
      setSubmitError(error instanceof Error ? error.message : "No se pudo guardar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    if (field.type === "info") {
      return (
        <div className="col-span-full rounded-md border border-[hsl(33_90%_50%_/_0.22)] bg-[hsl(33_90%_50%_/_0.08)] px-3 py-2 text-[0.8rem] text-[hsl(28_88%_36%)]">
          <p className="font-semibold">{field.label}</p>
          {field.helpText && <p className="mt-1 text-xs leading-5 opacity-90">{field.helpText}</p>}
        </div>
      );
    }

    const spanClass =
      field.type === "textarea" || field.type === "checkbox" || field.type === "checkboxGroup"
        ? "md:col-span-12"
        : field.span === 6
          ? "md:col-span-6"
          : field.span === 4
            ? "md:col-span-4"
            : field.span === 3
              ? "md:col-span-3"
              : "md:col-span-12";

    return (
      <div className={clsx("col-span-full", spanClass)}>
        {field.type !== "checkbox" && (
          <label htmlFor={field.name} className="form-label">
            {field.label} {field.required && "*"}
          </label>
        )}

        {field.type === "select" ? (
          <select
            id={field.name}
            name={field.name}
            required={field.required}
            value={String(formData[field.name] || "")}
            onChange={handleInputChange}
            className="form-select"
          >
            <option value="">Seleccionar...</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : field.type === "checkboxGroup" ? (
          <div className="grid gap-2 rounded-lg border border-[hsl(220_14%_88%_/_0.85)] bg-white p-3">
            {field.options?.map((option) => (
              <label key={option.value} className="flex items-center gap-3 text-sm text-[hsl(222_38%_12%)]">
                <input
                  type="checkbox"
                  checked={Array.isArray(formData[field.name]) && (formData[field.name] as string[]).includes(option.value)}
                  onChange={(event) => handleCheckboxGroupChange(field.name, option.value, event.target.checked)}
                  className="h-4 w-4 rounded border-[hsl(220_16%_86%)]"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        ) : field.type === "checkbox" ? (
          <label className="flex items-start gap-3 rounded-lg border border-[hsl(220_14%_88%_/_0.85)] bg-white p-3 text-[0.85rem] text-[hsl(222_38%_12%)]">
            <input
              id={field.name}
              type="checkbox"
              checked={Boolean(formData[field.name])}
              onChange={(event) => handleCheckboxChange(field.name, event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[hsl(220_16%_86%)]"
            />
            <span>{field.label}</span>
          </label>
        ) : field.type === "textarea" ? (
          <textarea
            id={field.name}
            name={field.name}
            required={field.required}
            value={String(formData[field.name] || "")}
            onChange={handleInputChange}
            rows={4}
                    className="form-input min-h-[88px] resize-y"
          />
        ) : (
          <input
            id={field.name}
            type={field.type === "email" ? "email" : field.type === "tel" ? "tel" : field.type}
            name={field.name}
            required={field.required}
            value={String(formData[field.name] || "")}
            onChange={handleInputChange}
            className="form-input"
          />
        )}

        {field.helpText && (
          <p className="mt-2 text-xs leading-5 text-[hsl(219_18%_52%)]">{field.helpText}</p>
        )}
      </div>
    );
  };

  if (isLoadingDraft) {
    return <div className="page-shell pb-6"><EmptyState icon={Loader2} title="Cargando borrador" description="Estamos recuperando la informacion de la solicitud para continuar la edicion." /></div>;
  }

  return (
    <div className="page-shell space-y-4 pb-4">
      <PageHeader
        title={editId ? "Editar solicitud" : "Nueva solicitud"}
        subtitle="Crea una solicitud interna con el mismo lenguaje visual y operativo del resto del ecosistema Albroksa."
        icon={ShieldCheck}
        actions={
          step > 1 ? (
            <AppButton variant="secondary" onClick={() => setStep((value) => Math.max(1, value - 1))}>
              <ArrowLeft className="h-4 w-4" />
              Volver
            </AppButton>
          ) : undefined
        }
      />

      {submitError && (
        <SurfaceCard className="border-[hsl(353_83%_60%_/_0.18)] bg-[hsl(353_83%_60%_/_0.08)] text-[hsl(353_72%_46%)]">
          <div className="relative z-10 flex items-center gap-3 text-sm font-semibold">
            <XCircle className="h-5 w-5" />
            {submitError}
          </div>
        </SurfaceCard>
      )}

      <div className="relative grid gap-2 md:grid-cols-4">
        {stepLabels.map((label, index) => {
          const current = index + 1;
          const active = step === current;
          const completed = step > current;
          const isLast = index === stepLabels.length - 1;

          return (
            <div
              key={label}
              className={clsx(
                "flex items-center gap-2.5 rounded-md border px-3 py-2 transition",
                active
                  ? "border-[hsl(350_78%_50%_/_0.35)] bg-[hsl(350_78%_50%_/_0.07)]"
                  : completed
                    ? "border-[hsl(152_58%_38%_/_0.22)] bg-white"
                    : "border-[hsl(220_14%_88%_/_0.85)] bg-white",
              )}
            >
              <div
                className={clsx(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[0.72rem] font-semibold transition",
                  completed
                    ? "bg-[hsl(152_58%_38%)] text-white"
                    : active
                      ? "bg-[hsl(350_78%_50%)] text-white"
                      : "border border-[hsl(220_14%_88%)] bg-white text-[hsl(219_14%_46%)]",
                )}
              >
                {completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : current}
              </div>
              <div className="min-w-0">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-[hsl(219_14%_46%)] leading-none">
                  Paso {current}
                </p>
                <p
                  className={clsx(
                    "mt-0.5 truncate text-[0.82rem] font-semibold leading-tight",
                    active ? "text-[hsl(350_78%_44%)]" : "text-[hsl(222_38%_12%)]",
                  )}
                >
                  {label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <div>
          <p className="mb-3 text-[0.78rem] font-semibold uppercase tracking-[0.04em] text-[hsl(219_14%_46%)]">
            Selecciona el tipo de seguro
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {(Object.entries(insuranceTypeMeta) as Array<[InsuranceType, typeof insuranceTypeMeta[InsuranceType]]>).map(([insuranceType, meta]) => {
              const Icon = meta.icon;
              return (
                <button
                  key={insuranceType}
                  type="button"
                  onClick={() => handleTypeSelect(insuranceType)}
                  className="group text-left"
                >
                  <SurfaceCard className="relative h-full overflow-hidden transition hover:-translate-y-0.5 hover:border-[hsl(350_78%_50%_/_0.45)] hover:shadow-[0_8px_20px_-12px_hsl(350_78%_50%_/_0.45)]">
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[hsl(350_78%_50%)] to-transparent opacity-0 transition group-hover:opacity-100"
                    />
                    <div className="relative z-10 flex h-full flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <span className="icon-badge h-9 w-9 rounded-md" data-tone={meta.tone}>
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-[hsl(219_14%_46%)] transition group-hover:translate-x-0.5 group-hover:text-[hsl(350_78%_50%)]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[1.05rem] font-semibold tracking-[-0.015em] text-[hsl(222_38%_12%)] leading-tight">
                          {insuranceType}
                        </p>
                        <p className="mt-1.5 text-[0.78rem] leading-snug text-[hsl(219_14%_46%)]">
                          {meta.description}
                        </p>
                      </div>
                    </div>
                  </SurfaceCard>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && type && (
        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <SectionCard title="Carga de poliza actual" description="Sube una poliza o una imagen para extraer datos y acelerar la confeccion del expediente." icon={UploadCloud}>
            <label htmlFor="policy-upload" className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[hsl(220_14%_88%)] bg-white px-4 py-6 text-center transition hover:border-[hsl(350_78%_50%_/_0.38)] hover:bg-[hsl(350_78%_50%_/_0.05)]">
              {isExtracting ? (
                <div className="space-y-2">
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-[hsl(350_78%_50%)]" />
                  <p className="text-base font-semibold text-[hsl(222_38%_12%)]">Extrayendo datos...</p>
                  <p className="text-sm text-[hsl(219_18%_52%)]">La IA esta leyendo la poliza y preparando el formulario.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="icon-badge mx-auto h-10 w-10 rounded-md"><UploadCloud className="h-5 w-5" /></span>
                  <div>
                    <p className="text-lg font-semibold tracking-[-0.02em] text-[hsl(222_38%_12%)]">Subir poliza actual</p>
                    <p className="mt-2 text-sm leading-6 text-[hsl(219_18%_52%)]">PDF o imagen. Arrastra el archivo o haz clic para seleccionar.</p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(152_58%_38%_/_0.18)] bg-[hsl(152_58%_38%_/_0.1)] px-3 py-1 text-[0.78rem] font-medium text-[hsl(152_58%_30%)]">
                    <Sparkles className="h-4 w-4" />
                    Extraccion automatica
                  </div>
                </div>
              )}
              <input id="policy-upload" type="file" className="hidden" accept=".pdf,image/*" onChange={handleExtract} />
            </label>
          </SectionCard>

          <SurfaceCard className="h-fit" padding="lg">
            <div className="relative z-10 space-y-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[hsl(350_78%_50%)]">Ramo seleccionado</p>
                <h2 className="mt-2 text-[1.9rem] font-extrabold tracking-[-0.04em] text-[hsl(222_38%_12%)]">{type}</h2>
                <p className="mt-2 text-sm leading-6 text-[hsl(219_18%_52%)]">Puedes apoyarte en la extraccion automatica o rellenar todo manualmente.</p>
              </div>
              <div className="rounded-[1.2rem] border border-[hsl(220_16%_86%_/_0.8)] bg-white/70 p-4">
                <p className="text-sm font-semibold text-[hsl(222_38%_12%)]">Sugerencia operativa</p>
                <p className="mt-2 text-sm leading-6 text-[hsl(219_18%_52%)]">Si la poliza esta incompleta o no es legible, puedes continuar con captura manual y adjuntar la documentacion al final.</p>
              </div>
              <AppButton variant="secondary" onClick={() => setStep(3)} className="w-full">
                Continuar sin poliza
                <ArrowRight className="h-4 w-4" />
              </AppButton>
            </div>
          </SurfaceCard>
        </div>
      )}

      {step === 3 && schema && (
                <div className="space-y-2.5">
          {groupedFields.length > 0 && (
            <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-[hsl(220_14%_88%_/_0.85)] bg-white p-1">
              {groupedFields.map((section, idx) => (
                <button
                  key={section.title}
                  type="button"
                  onClick={() => setCurrentSectionIndex(idx)}
                  className={clsx(
                    "rounded-md px-2.5 py-1 text-[0.78rem] font-semibold transition-colors",
                    currentSectionIndex === idx
                      ? "bg-[hsl(350_78%_50%)] text-white"
                      : "text-[hsl(219_14%_46%)] hover:bg-[hsl(220_22%_97%)] hover:text-[hsl(222_38%_12%)]"
                  )}
                >
                  <span className="opacity-60">{idx + 1}.</span> {section.title}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
            {/* Left Column: Summary sticky */}
            <div className="space-y-3 xl:sticky xl:top-2 xl:self-start">
              <SurfaceCard padding="md">
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[hsl(350_78%_50%)]">
                      Resumen
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(220_22%_97%)] px-1.5 py-0.5 text-[0.65rem] font-semibold text-[hsl(219_14%_46%)]">
                      {Object.values(formData).filter(Boolean).length} campos
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-[hsl(219_14%_46%)]">Ramo</p>
                      <p className="mt-0.5 truncate text-[0.82rem] font-semibold text-[hsl(222_38%_12%)]">{type}</p>
                    </div>
                    <div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-[hsl(219_14%_46%)]">Cliente</p>
                      <p className="mt-0.5 truncate text-[0.82rem] font-semibold text-[hsl(222_38%_12%)]">{clientName || "Pendiente"}</p>
                    </div>
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard padding="md">
                <div className="relative z-10 space-y-2.5">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[hsl(219_14%_46%)]">
                    Checklist de envio
                  </p>
                  <ul className="space-y-1.5 text-[0.78rem] text-[hsl(222_38%_12%)]">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(152_58%_38%)]" />
                      <span className="leading-snug">Identificacion del cliente cumplimentada.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(152_58%_38%)]" />
                      <span className="leading-snug">Riesgo documentado con informacion suficiente.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Paperclip className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(219_14%_46%)]" />
                      <span className="leading-snug text-[hsl(219_14%_46%)]">Los adjuntos se incorporan en el siguiente paso.</span>
                    </li>
                  </ul>
                </div>
              </SurfaceCard>
            </div>

            {/* Right Column: Form */}
            <div className="space-y-3">
              {currentSectionIndex === 0 && (
                <SectionCard
                  title={editId ? "Edicion del borrador" : schema.title}
                  description="Completa la informacion tecnica y revisa los datos clave antes de enviar."
                  icon={FileText}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label htmlFor="clientName" className="form-label">Nombre del cliente / tomador *</label>
                      <input id="clientName" type="text" value={clientName} onChange={(event) => setClientName(event.target.value)} className="form-input" placeholder="Nombre del cliente" required />
                    </div>
                    <div>
                      <label htmlFor="observaciones" className="form-label">Observaciones internas</label>
                      <textarea id="observaciones" value={observaciones} onChange={(event) => setObservaciones(event.target.value)} className="form-input min-h-[34px] resize-y" placeholder="Notas internas para el equipo de gestion." />
                    </div>
                  </div>
                </SectionCard>
              )}

              {groupedFields[currentSectionIndex] && (
                <FormSection
                  key={groupedFields[currentSectionIndex].title}
                  title={groupedFields[currentSectionIndex].title}
                  description="Rellena con el mayor nivel de detalle posible para agilizar la cotizacion."
                >
                  {type === "Auto" && groupedFields[currentSectionIndex].title === "Propietario" && (
                    <div className="col-span-full">
                      <AppButton type="button" variant="secondary" size="sm" onClick={() => handleCopyData("tomador", "propietario")}>
                        Copiar datos de Tomador
                      </AppButton>
                    </div>
                  )}
                  {type === "Auto" && groupedFields[currentSectionIndex].title === "Conductor habitual" && (
                    <div className="col-span-full flex flex-wrap gap-2">
                      <AppButton type="button" variant="secondary" size="sm" onClick={() => handleCopyData("tomador", "conductor")}>
                        Copiar datos de Tomador
                      </AppButton>
                      <AppButton type="button" variant="secondary" size="sm" onClick={() => handleCopyData("propietario", "conductor")}>
                        Copiar datos del Propietario
                      </AppButton>
                    </div>
                  )}
                  <div className="col-span-full grid grid-cols-1 gap-3 md:grid-cols-12">
                    {groupedFields[currentSectionIndex].fields.map((field) => <React.Fragment key={field.name}>{renderField(field)}</React.Fragment>)}
                  </div>
                </FormSection>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <AppButton variant="secondary" size="sm" onClick={() => {
                  if (currentSectionIndex > 0) setCurrentSectionIndex((prev) => prev - 1);
                  else setStep(2);
                }}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {currentSectionIndex > 0 ? "Seccion anterior" : "Volver"}
                </AppButton>
                <AppButton size="sm" onClick={() => {
                  if (currentSectionIndex < groupedFields.length - 1) setCurrentSectionIndex((prev) => prev + 1);
                  else setStep(4);
                }}>
                  {currentSectionIndex < groupedFields.length - 1 ? "Siguiente seccion" : "Continuar a adjuntos"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </AppButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
                  <div className="space-y-2.5">
            <SurfaceCard padding="lg">
              <div className="relative z-10 space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[hsl(350_78%_50%)]">Resumen del envio</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[hsl(219_18%_52%)]">Ramo</p>
                    <p className="mt-1 text-base font-semibold text-[hsl(222_38%_12%)]">{type}</p>
                  </div>
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[hsl(219_18%_52%)]">Cliente</p>
                    <p className="mt-1 text-base font-semibold text-[hsl(222_38%_12%)]">{clientName || "Pendiente"}</p>
                  </div>
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[hsl(219_18%_52%)]">Adjuntos</p>
                    <p className="mt-1 text-base font-semibold text-[hsl(222_38%_12%)]">{attachments.length}</p>
                  </div>
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard padding="lg">
              <div className="relative z-10 space-y-3">
                <p className="text-base font-semibold tracking-[-0.02em] text-[hsl(222_38%_12%)]">Destino operativo</p>
                <p className="text-sm leading-6 text-[hsl(219_18%_52%)]">La solicitud se remitira por correo estructurado para su cotizacion y gestion en la delegacion de Candeleda.</p>
              </div>
            </SurfaceCard>
          </div>

          <SectionCard title="Documentacion adicional" description="Adjunta polizas, recibos o documentos de soporte antes de enviar la solicitud." icon={Paperclip}>
                    <div className="space-y-2.5">
              <label htmlFor="docs-upload" className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[hsl(220_14%_88%)] bg-white px-4 py-6 text-center transition hover:border-[hsl(350_78%_50%_/_0.38)] hover:bg-[hsl(350_78%_50%_/_0.05)]">
                <span className="icon-badge mx-auto h-10 w-10 rounded-md"><Paperclip className="h-5 w-5" /></span>
                <p className="mt-4 text-lg font-semibold tracking-[-0.02em] text-[hsl(222_38%_12%)]">Anadir documentos</p>
                <p className="mt-2 text-sm leading-6 text-[hsl(219_18%_52%)]">PDF, JPG, PNG o DOCX. Se validaran antes de adjuntarlos a la solicitud.</p>
                <input id="docs-upload" type="file" multiple className="hidden" onChange={(event) => {
                  if (event.target.files) setAttachments((previous) => [...previous, ...Array.from(event.target.files || [])]);
                }} />
              </label>

              {attachments.length > 0 ? (
                <div className="grid gap-3">
                  {attachments.map((file, index) => (
                    <SurfaceCard key={`${file.name}-${index}`} variant="soft" className="overflow-hidden">
                      <div className="relative z-10 flex items-center gap-3">
                        <span className="icon-badge h-8 w-8 rounded-md" data-tone="neutral"><FileText className="h-3.5 w-3.5" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-[hsl(222_38%_12%)]">{file.name}</p>
                          <p className="mt-1 text-sm text-[hsl(219_18%_52%)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button type="button" onClick={() => setAttachments((previous) => previous.filter((_, attachmentIndex) => attachmentIndex !== index))} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[hsl(220_14%_88%)] bg-white text-[hsl(219_14%_46%)] transition hover:text-[hsl(353_72%_44%)]">
                          <XCircle className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </SurfaceCard>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Paperclip} title="Todavia no hay adjuntos" description="Puedes enviar la solicitud sin documentos o completar este paso con la documentacion disponible." />
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <AppButton variant="secondary" onClick={() => setStep(3)} disabled={isSubmitting}>
                  <ArrowLeft className="h-4 w-4" />
                  Volver a datos
                </AppButton>
                <AppButton variant="secondary" onClick={(event) => handleSubmit(event as unknown as React.FormEvent, true)} disabled={isSubmitting}>Guardar borrador</AppButton>
                <AppButton onClick={(event) => handleSubmit(event as unknown as React.FormEvent, false)} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isSubmitting ? "Enviando..." : "Enviar a Candeleda"}
                </AppButton>
              </div>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
