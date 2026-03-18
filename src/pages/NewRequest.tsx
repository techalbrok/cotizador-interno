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
    setStep(2);
  };

  const handleExtract = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    setIsExtracting(true);
    try {
      const response = await apiFetch("/api/extract", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
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
        <div className="col-span-full rounded-[1.05rem] border border-[hsl(33_90%_55%_/_0.24)] bg-[hsl(33_90%_55%_/_0.08)] px-4 py-3 text-sm text-[hsl(28_88%_38%)]">
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
          <div className="grid gap-2 rounded-[1rem] border border-[hsl(220_16%_86%_/_0.9)] bg-white/80 p-4">
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
          <label className="flex items-start gap-3 rounded-[1rem] border border-[hsl(220_16%_86%_/_0.9)] bg-white/80 p-4 text-sm text-[hsl(222_38%_12%)]">
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
            className="form-input min-h-[120px] resize-y"
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
    <div className="page-shell space-y-6 pb-6">
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

      <SurfaceCard className="overflow-hidden" padding="lg">
        <div className="relative z-10 grid gap-3 md:grid-cols-4">
          {stepLabels.map((label, index) => {
            const current = index + 1;
            const active = step === current;
            const completed = step > current;

            return (
              <div
                key={label}
                className={clsx(
                  "rounded-[1.25rem] border px-4 py-4 transition",
                  active ? "border-[hsl(350_78%_50%_/_0.28)] bg-[hsl(350_78%_50%_/_0.1)] shadow-[var(--shadow-glow)]" : "border-[hsl(220_16%_86%_/_0.82)] bg-white/65"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx("flex h-10 w-10 items-center justify-center rounded-[1rem] border text-sm font-extrabold", completed || active ? "border-transparent bg-[linear-gradient(135deg,hsl(350_78%_50%),hsl(358_88%_58%))] text-white" : "border-[hsl(220_16%_86%)] bg-white text-[hsl(219_18%_52%)]")}>
                    {completed ? <CheckCircle2 className="h-4 w-4" /> : current}
                  </div>
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[hsl(219_18%_52%)]">Paso {current}</p>
                    <p className="text-sm font-semibold text-[hsl(222_38%_12%)]">{label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SurfaceCard>

      {step === 1 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(Object.entries(insuranceTypeMeta) as Array<[InsuranceType, typeof insuranceTypeMeta[InsuranceType]]>).map(([insuranceType, meta]) => {
            const Icon = meta.icon;
            return (
              <button key={insuranceType} type="button" onClick={() => handleTypeSelect(insuranceType)} className="text-left">
                <SurfaceCard className="h-full transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]">
                  <div className="relative z-10 flex h-full flex-col gap-5">
                    <span className="icon-badge h-14 w-14 rounded-[1.2rem]" data-tone={meta.tone}>
                      <Icon className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="text-xl font-extrabold tracking-[-0.03em] text-[hsl(222_38%_12%)]">{insuranceType}</p>
                      <p className="mt-2 text-sm leading-6 text-[hsl(219_18%_52%)]">{meta.description}</p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(350_78%_50%)]">
                      Continuar
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </SurfaceCard>
              </button>
            );
          })}
        </div>
      )}

      {step === 2 && type && (
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <SectionCard title="Carga de poliza actual" description="Sube una poliza o una imagen para extraer datos y acelerar la confeccion del expediente." icon={UploadCloud}>
            <label htmlFor="policy-upload" className="flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-[hsl(220_16%_86%)] bg-white/70 px-6 py-10 text-center transition hover:border-[hsl(350_78%_50%_/_0.38)] hover:bg-[hsl(350_78%_50%_/_0.05)]">
              {isExtracting ? (
                <div className="space-y-4">
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-[hsl(350_78%_50%)]" />
                  <p className="text-base font-semibold text-[hsl(222_38%_12%)]">Extrayendo datos...</p>
                  <p className="text-sm text-[hsl(219_18%_52%)]">La IA esta leyendo la poliza y preparando el formulario.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <span className="icon-badge mx-auto h-16 w-16 rounded-[1.3rem]"><UploadCloud className="h-7 w-7" /></span>
                  <div>
                    <p className="text-lg font-semibold tracking-[-0.02em] text-[hsl(222_38%_12%)]">Subir poliza actual</p>
                    <p className="mt-2 text-sm leading-6 text-[hsl(219_18%_52%)]">PDF o imagen. Arrastra el archivo o haz clic para seleccionar.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(152_58%_42%_/_0.18)] bg-[hsl(152_58%_42%_/_0.1)] px-4 py-2 text-sm font-semibold text-[hsl(152_58%_30%)]">
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
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <SectionCard title={editId ? "Edicion del borrador" : schema.title} description="Completa la informacion tecnica y revisa los datos clave antes de enviar." icon={FileText}>
              <div className="grid gap-5">
                <div>
                  <label htmlFor="clientName" className="form-label">Nombre del cliente / tomador *</label>
                  <input id="clientName" type="text" value={clientName} onChange={(event) => setClientName(event.target.value)} className="form-input" placeholder="Nombre del cliente" required />
                </div>
                <div>
                  <label htmlFor="observaciones" className="form-label">Observaciones internas</label>
                  <textarea id="observaciones" value={observaciones} onChange={(event) => setObservaciones(event.target.value)} className="form-input min-h-[110px] resize-y" placeholder="Notas internas para el equipo de gestion." />
                </div>
              </div>
            </SectionCard>

            {groupedFields.map((section) => (
              <FormSection key={section.title} title={section.title} description="Rellena con el mayor nivel de detalle posible para agilizar la cotizacion.">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
                  {section.fields.map((field) => <React.Fragment key={field.name}>{renderField(field)}</React.Fragment>)}
                </div>
              </FormSection>
            ))}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <AppButton variant="secondary" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4" />
                Volver
              </AppButton>
              <AppButton onClick={() => setStep(4)}>
                Continuar a adjuntos
                <ArrowRight className="h-4 w-4" />
              </AppButton>
            </div>
          </div>

          <div className="space-y-6">
            <SurfaceCard padding="lg">
              <div className="relative z-10 space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[hsl(350_78%_50%)]">Resumen</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[hsl(219_18%_52%)]">Ramo</p>
                    <p className="mt-1 text-base font-semibold text-[hsl(222_38%_12%)]">{type}</p>
                  </div>
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[hsl(219_18%_52%)]">Cliente</p>
                    <p className="mt-1 text-base font-semibold text-[hsl(222_38%_12%)]">{clientName || "Pendiente"}</p>
                  </div>
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[hsl(219_18%_52%)]">Campos informados</p>
                    <p className="mt-1 text-base font-semibold text-[hsl(222_38%_12%)]">{Object.values(formData).filter(Boolean).length}</p>
                  </div>
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard padding="lg">
              <div className="relative z-10 space-y-3">
                <p className="text-base font-semibold tracking-[-0.02em] text-[hsl(222_38%_12%)]">Checklist de envio</p>
                <ul className="space-y-2 text-sm text-[hsl(219_18%_52%)]">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(152_58%_42%)]" /> Identificacion del cliente cumplimentada.</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(152_58%_42%)]" /> Riesgo documentado con informacion suficiente.</li>
                  <li className="flex items-center gap-2"><Paperclip className="h-4 w-4 text-[hsl(350_78%_50%)]" /> Los adjuntos se incorporan en el siguiente paso.</li>
                </ul>
              </div>
            </SurfaceCard>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <SectionCard title="Documentacion adicional" description="Adjunta polizas, recibos o documentos de soporte antes de enviar la solicitud." icon={Paperclip}>
            <div className="space-y-6">
              <label htmlFor="docs-upload" className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-[hsl(220_16%_86%)] bg-white/70 px-6 py-10 text-center transition hover:border-[hsl(350_78%_50%_/_0.38)] hover:bg-[hsl(350_78%_50%_/_0.05)]">
                <span className="icon-badge mx-auto h-16 w-16 rounded-[1.3rem]"><Paperclip className="h-7 w-7" /></span>
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
                        <span className="icon-badge h-11 w-11 rounded-[1rem]" data-tone="neutral"><FileText className="h-4.5 w-4.5" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-[hsl(222_38%_12%)]">{file.name}</p>
                          <p className="mt-1 text-sm text-[hsl(219_18%_52%)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button type="button" onClick={() => setAttachments((previous) => previous.filter((_, attachmentIndex) => attachmentIndex !== index))} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[hsl(220_16%_86%)] bg-white/80 text-[hsl(219_18%_52%)] transition hover:text-[hsl(353_72%_46%)]">
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

          <div className="space-y-6">
            <SurfaceCard padding="lg">
              <div className="relative z-10 space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[hsl(350_78%_50%)]">Resumen del envio</p>
                <div className="space-y-3">
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
        </div>
      )}
    </div>
  );
}
