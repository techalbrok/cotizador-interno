import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Building,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Mail,
  MessageSquare,
  Play,
  Send,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import { insuranceTypeMeta, safeText } from "../lib/ui";
import AppButton from "../components/ui/AppButton";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import StatusBadge from "../components/ui/StatusBadge";
import SurfaceCard from "../components/ui/SurfaceCard";

type ToastState = { message: string; type: "success" | "error" } | null;

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [request, setRequest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const readErrorMessage = async (response: Response) => {
    try {
      const data = await response.json();
      return data.message || "Se produjo un error inesperado";
    } catch {
      return "Se produjo un error inesperado";
    }
  };

  const loadRequest = async () => {
    if (!id || !token) return;
    const response = await apiFetch(`/api/solicitudes/${id}`, token);
    if (!response.ok) throw new Error("Not found");
    const data = await response.json();
    setRequest(data);
  };

  useEffect(() => {
    if (!id || !token) return;
    setLoading(true);
    loadRequest()
      .catch((error) => console.error(error))
      .finally(() => setLoading(false));
  }, [id, token]);

  const handleStatusUpdate = async (newStatus: string) => {
    setActionLoading("estado");
    try {
      const response = await apiFetch(`/api/solicitudes/${id}/estado`, token, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: newStatus }),
      });

      if (response.ok) {
        await loadRequest();
        showToast(`Estado actualizado a ${newStatus}`);
      } else {
        showToast(await readErrorMessage(response), "error");
      }
    } catch {
      showToast("Error al actualizar el estado", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnviarSolicitud = async () => {
    setActionLoading("enviar");
    try {
      const response = await apiFetch(`/api/solicitudes/${id}/enviar`, token, { method: "POST" });
      if (response.ok) {
        await loadRequest();
        showToast("Solicitud enviada correctamente a Candeleda");
      } else {
        showToast(await readErrorMessage(response), "error");
      }
    } catch {
      showToast("Error al enviar la solicitud", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDraft = async () => {
    if (!window.confirm("Estas seguro de que quieres eliminar este borrador?")) return;
    setActionLoading("eliminar");
    try {
      const response = await apiFetch(`/api/solicitudes/${id}`, token, { method: "DELETE" });
      if (response.ok) {
        navigate("/");
      } else {
        showToast(await readErrorMessage(response), "error");
      }
    } catch {
      showToast("Error al eliminar el borrador", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newComment.trim()) return;
    setActionLoading("comentario");
    try {
      const response = await apiFetch(`/api/solicitudes/${id}/comentarios`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comentario: newComment }),
      });
      if (response.ok) {
        const updated = await response.json();
        setRequest(updated);
        setNewComment("");
        showToast("Comentario anadido");
      } else {
        showToast(await readErrorMessage(response), "error");
      }
    } catch {
      showToast("Error al anadir comentario", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadAdjunto = async (adjuntoId: number, nombreOriginal: string) => {
    setActionLoading(`adjunto-${adjuntoId}`);
    try {
      const response = await apiFetch(`/api/adjuntos/${adjuntoId}/download`, token);
      if (!response.ok) {
        showToast(await readErrorMessage(response), "error");
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nombreOriginal;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast("Error al descargar el adjunto", "error");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="page-shell pb-6">
        <EmptyState icon={FileText} title="Cargando detalle" description="Estamos recuperando la solicitud y sus elementos relacionados." />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="page-shell pb-6">
        <EmptyState icon={AlertCircle} title="Solicitud no encontrada" description="No hemos podido localizar el expediente solicitado." />
      </div>
    );
  }

  const typeMeta = insuranceTypeMeta[request.ramo];
  const TypeIcon = typeMeta?.icon || FileText;
  const delegacionOrigen = request.delegacion_nombre || "Fuenlabrada";
  const clientName = String(request.datos_formulario?.nombre_cliente || request.creador_nombre || "Cliente");

  return (
    <div className="page-shell space-y-4 pb-4">
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-[1.1rem] px-5 py-3 text-sm font-semibold text-white shadow-lg ${toast.type === "success" ? "bg-[hsl(152_58%_42%)]" : "bg-[hsl(350_78%_50%)]"}`}>
          {toast.message}
        </div>
      )}

      <PageHeader
        title={clientName}
        subtitle={`${request.ramo} · ${request.referencia}`}
        icon={TypeIcon}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={request.estado} />
            <Link to="/">
              <AppButton variant="secondary">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </AppButton>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Cliente / tomador", value: clientName, icon: User },
          { label: "Delegacion origen", value: delegacionOrigen, icon: Building },
          { label: "Delegacion destino", value: "Candeleda", icon: ShieldCheck },
          { label: "Fecha de creacion", value: format(new Date(request.created_at), "dd MMM yyyy, HH:mm", { locale: es }), icon: Calendar },
        ].map((item) => (
          <SurfaceCard key={item.label}>
            <div className="relative z-10 flex items-start gap-4">
              <span className="icon-badge h-9 w-9 rounded-md" data-tone="neutral">
                <item.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[hsl(219_18%_52%)]">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-[hsl(222_38%_12%)]">{item.value}</p>
              </div>
            </div>
          </SurfaceCard>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <SectionCard title="Datos del riesgo" description="Informacion consolidada del formulario remitido." icon={FileText}>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(request.datos_formulario || {}).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-[hsl(220_14%_88%_/_0.85)] bg-white p-3">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[hsl(219_18%_52%)]">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[hsl(222_38%_12%)] break-words">
                    {safeText(value)}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Comentarios internos" description="Conversacion operativa y seguimiento interno." icon={MessageSquare}>
            <div className="space-y-4">
              {request.comentarios?.length > 0 ? (
                <div className="space-y-3">
                  {request.comentarios.map((comment: any) => {
                    const isOwn = comment.usuario_id === user?.id;
                    return (
                      <div key={comment.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[92%] rounded-lg border px-3 py-2 ${isOwn ? "border-[hsl(350_78%_50%_/_0.18)] bg-[hsl(350_78%_50%_/_0.08)]" : "border-[hsl(220_14%_88%_/_0.85)] bg-white"}`}>
                          <div className="flex flex-wrap items-center gap-2 text-[0.72rem] text-[hsl(219_14%_46%)]">
                            <span className="font-semibold text-[hsl(222_38%_12%)]">{comment.usuario_nombre}</span>
                            <span>{format(new Date(comment.created_at), "dd MMM, HH:mm", { locale: es })}</span>
                          </div>
                          <p className="mt-1 text-[0.85rem] leading-snug text-[hsl(222_38%_12%)]">{comment.comentario}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={MessageSquare} title="Sin comentarios" description="Todavia no hay actividad conversacional en esta solicitud." />
              )}

              <form onSubmit={handleAddComment} className="grid gap-3">
                <textarea
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                    className="form-input min-h-[80px] resize-y"
                  placeholder="Escribe un comentario o una nota interna..."
                />
                <div className="flex justify-end">
                  <AppButton type="submit" disabled={!newComment.trim() || actionLoading === "comentario"}>
                    <Send className="h-4 w-4" />
                    {actionLoading === "comentario" ? "Guardando..." : "Anadir comentario"}
                  </AppButton>
                </div>
              </form>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Acciones" description="Flujos disponibles segun el rol y el estado actual." icon={ShieldCheck}>
            <div className="grid gap-3">
              {user?.rol === "operador" ? (
                <>
                  {request.estado === "Borrador" && (
                    <AppButton onClick={handleEnviarSolicitud} disabled={actionLoading !== null} className="w-full">
                      <Send className="h-4 w-4" />
                      {actionLoading === "enviar" ? "Enviando..." : "Enviar a Candeleda"}
                    </AppButton>
                  )}
                  {request.estado === "Borrador" && (
                    <Link to={`/new?editId=${request.id}`} className="w-full">
                      <AppButton variant="secondary" className="w-full">Editar borrador</AppButton>
                    </Link>
                  )}
                  {request.estado === "Borrador" && (
                    <AppButton variant="danger" onClick={handleDeleteDraft} disabled={actionLoading !== null} className="w-full">
                      <Trash2 className="h-4 w-4" />
                      Eliminar borrador
                    </AppButton>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const subject = `[${delegacionOrigen}] Solicitud ${request.ramo} - ${clientName} (${request.referencia})`;
                      const body = `Hola equipo de Candeleda,%0D%0A%0D%0AREFERENCIA: ${request.referencia}%0D%0ARAMO: ${request.ramo}%0D%0ACLIENTE: ${clientName}%0D%0A%0D%0ASaludos,%0D%0ADelegacion ${delegacionOrigen}`;
                      window.location.href = `mailto:candeleda@albroksa.com?subject=${encodeURIComponent(subject)}&body=${body}`;
                    }}
                    className="button-secondary-albroksa w-full"
                  >
                    <Mail className="h-4 w-4" />
                    Reenviar por email
                  </button>
                </>
              ) : (
                <>
                  <AppButton variant="secondary" onClick={() => handleStatusUpdate("En gestión")} disabled={actionLoading !== null} className="w-full">
                    <Play className="h-4 w-4" />
                    Iniciar gestion
                  </AppButton>
                  <AppButton onClick={() => handleStatusUpdate("Emitida")} disabled={actionLoading !== null} className="w-full">
                    <CheckCircle2 className="h-4 w-4" />
                    Marcar como emitida
                  </AppButton>
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Documentacion" description="Adjuntos asociados a la solicitud." icon={Download}>
            {request.adjuntos?.length > 0 ? (
              <div className="grid gap-3">
                {request.adjuntos.map((file: any) => (
                  <SurfaceCard key={file.id} variant="soft">
                    <div className="relative z-10 flex items-center gap-3">
                      <span className="icon-badge h-8 w-8 rounded-md" data-tone="neutral">
                        <FileText className="h-4.5 w-4.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[hsl(222_38%_12%)]">{file.nombre_original}</p>
                        <p className="mt-1 text-sm text-[hsl(219_18%_52%)]">{(file.tamanio_bytes / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadAdjunto(file.id, file.nombre_original)}
                        disabled={actionLoading !== null}
                        className="button-secondary-albroksa min-h-10 px-3"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </SurfaceCard>
                ))}
              </div>
            ) : (
              <EmptyState icon={FileText} title="Sin adjuntos" description="Esta solicitud no tiene documentacion adicional cargada." />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
