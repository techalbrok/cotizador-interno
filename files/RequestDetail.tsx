import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle, FileText, Mail, Building, User, Calendar, Car, HeartPulse, Home, Store, AlertCircle, MessageSquare, Send, Trash2, Play } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "../context/AuthContext";

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [request, setRequest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (id && token) {
      fetch(`/api/solicitudes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) throw new Error("Not found");
          return res.json();
        })
        .then((data) => {
          setRequest(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [id, token]);

  if (loading) {
    return <div className="p-10 text-center text-[var(--color-text-secondary)]">Cargando detalle...</div>;
  }

  if (!request) {
    return <div className="p-10 text-center text-[var(--color-brand)] font-medium">Solicitud no encontrada</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Borrador": return "bg-[#F7F7F5] text-[#8C8C8C] border-transparent";
      case "Enviada": return "bg-[#EFF6FF] text-[#2563EB] border-transparent";
      case "En gestión": return "bg-[#FFF7ED] text-[#C2410C] border-transparent";
      case "Respondida": return "bg-[#F3E8FF] text-[#7E22CE] border-transparent";
      case "Emitida": return "bg-[#F0FDF4] text-[#16A34A] border-transparent";
      case "Cancelada": return "bg-[#FFF1F2] text-[#DC2626] border-transparent";
      default: return "bg-[#F7F7F5] text-[#8C8C8C] border-transparent";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "Auto": return <Car className="w-6 h-6 text-blue-500" />;
      case "Hogar": return <Home className="w-6 h-6 text-emerald-500" />;
      case "Comercio": return <Store className="w-6 h-6 text-amber-500" />;
      case "Salud Extranjería": return <HeartPulse className="w-6 h-6 text-purple-500" />;
      default: return <FileText className="w-6 h-6 text-[var(--color-text-secondary)]" />;
    }
  };

  // FIX: delegacion_nombre en lugar de creador_delegacion
  const delegacionOrigen = request.delegacion_nombre || "Fuenlabrada";

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/solicitudes/${id}/estado`, {
        method: "PUT",  // FIX: era PATCH
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ estado: newStatus }),
      });
      if (res.ok) {
        setRequest((prev: any) => ({ ...prev, estado: newStatus }));
        showToast(`Estado actualizado a ${newStatus}`);
      } else {
        showToast("Error al actualizar el estado", "error");
      }
    } catch (error) {
      showToast("Error al actualizar el estado", "error");
    }
  };

  const handleDeleteDraft = async () => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este borrador?")) return;
    try {
      const res = await fetch(`/api/solicitudes/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        navigate("/");
      } else {
        showToast("Error al eliminar el borrador", "error");
      }
    } catch (error) {
      showToast("Error al eliminar el borrador", "error");
    }
  };

  const handleSendEmail = () => {
    if (!request) return;
    const cliente = request.datos_formulario?.nombre_cliente || request.creador_nombre;
    const subject = `[${delegacionOrigen}] Solicitud ${request.ramo} - ${cliente} (${request.referencia})`;
    let dataStr = "";
    if (request.datos_formulario) {
      Object.entries(request.datos_formulario).forEach(([key, value]) => {
        dataStr += `${key.toUpperCase()}: ${value}\n`;
      });
    }
    const body = `Hola equipo de Candeleda,\n\nREFERENCIA: ${request.referencia}\nRAMO: ${request.ramo}\nCLIENTE: ${cliente}\n\nDATOS:\n${dataStr}\n\nSaludos,\nDelegación ${delegacionOrigen}`;
    window.location.href = `mailto:candeleda@albroksa.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleReplyEmail = () => {
    if (!request) return;
    const cliente = request.datos_formulario?.nombre_cliente || request.creador_nombre;
    const subject = `RE: Solicitud [${request.ramo}] - ${cliente} (${request.referencia})`;
    const body = `Hola equipo de ${delegacionOrigen},\n\nRespecto a la solicitud ${request.referencia}:\n\n[Escribe aquí tu respuesta]\n\nSaludos,\nDelegación Candeleda`;
    window.location.href = `mailto:${delegacionOrigen.toLowerCase()}@albroksa.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`/api/solicitudes/${id}/comentarios`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ comentario: newComment }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRequest(updated);
        setNewComment("");
        showToast("Comentario añadido");
      } else {
        showToast("Error al añadir comentario", "error");
      }
    } catch (error) {
      showToast("Error al añadir comentario", "error");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-[10px] shadow-lg font-medium text-white z-50 flex items-center gap-2 ${toast.type === "success" ? "bg-[#10B981]" : "bg-[var(--color-brand)]"}`}>
          {toast.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[10px] shadow-[var(--shadow-card)] border border-[var(--color-border-card)] overflow-hidden">
            <div className="p-[20px] border-b border-[var(--color-border-card)] flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[var(--color-bg-app)] rounded-[7px] border border-[var(--color-border-card)]">
                  {getIcon(request.ramo)}
                </div>
                <div>
                  <h2 className="text-[18px] font-semibold text-[var(--color-text-main)]">{request.ramo}</h2>
                  <p className="text-[13px] text-[var(--color-text-secondary)] font-mono mt-1">{request.referencia}</p>
                </div>
              </div>
              {user?.rol === "gestor" ? (
                <select
                  value={request.estado}
                  onChange={(e) => handleStatusUpdate(e.target.value)}
                  className={`px-3 py-1.5 rounded-[5px] text-[12px] font-medium border outline-none cursor-pointer ${getStatusColor(request.estado)}`}
                >
                  <option value="Borrador">Borrador</option>
                  <option value="Enviada">Enviada</option>
                  <option value="En gestión">En gestión</option>
                  <option value="Respondida">Respondida</option>
                  <option value="Emitida">Emitida</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              ) : (
                <span className={`px-[8px] py-[3px] rounded-[5px] text-[12px] font-medium border ${getStatusColor(request.estado)}`}>
                  {request.estado}
                </span>
              )}
            </div>

            <div className="p-[20px] grid grid-cols-2 gap-y-6 gap-x-8">
              <div>
                <p className="text-[12px] font-medium text-[var(--color-text-secondary)] uppercase tracking-[0.05em] mb-1 flex items-center gap-2">
                  <User className="w-4 h-4" /> Cliente / Tomador
                </p>
                <p className="text-[14px] text-[var(--color-text-main)]">{request.datos_formulario?.nombre_cliente || request.creador_nombre}</p>
              </div>
              <div>
                <p className="text-[12px] font-medium text-[var(--color-text-secondary)] uppercase tracking-[0.05em] mb-1 flex items-center gap-2">
                  <Building className="w-4 h-4" /> Delegación Origen
                </p>
                <p className="text-[14px] text-[var(--color-text-main)]">{delegacionOrigen}</p>
              </div>
              <div>
                <p className="text-[12px] font-medium text-[var(--color-text-secondary)] uppercase tracking-[0.05em] mb-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Fecha de Creación
                </p>
                <p className="text-[14px] text-[var(--color-text-main)]">
                  {format(new Date(request.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                </p>
              </div>
              <div>
                <p className="text-[12px] font-medium text-[var(--color-text-secondary)] uppercase tracking-[0.05em] mb-1 flex items-center gap-2">
                  <Building className="w-4 h-4" /> Delegación Destino
                </p>
                <p className="text-[14px] text-[var(--color-text-main)]">Candeleda</p>
              </div>
            </div>
          </div>

          {/* Form Data */}
          <div className="bg-white rounded-[10px] shadow-[var(--shadow-card)] border border-[var(--color-border-card)] overflow-hidden">
            <div className="p-[20px] border-b border-[var(--color-border-card)]">
              <h3 className="text-[16px] font-semibold text-[var(--color-text-main)]">Datos del Riesgo</h3>
            </div>
            <div className="p-[20px]">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                {request.datos_formulario && Object.entries(request.datos_formulario).map(([key, value]) => (
                  <div key={key} className="border-b border-[var(--color-border-row)] pb-3">
                    <dt className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-[0.06em] mb-1">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </dt>
                    <dd className="text-[14px] text-[var(--color-text-main)] font-medium break-words">
                      {String(value) || "-"}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Comments */}
          <div className="bg-white rounded-[10px] shadow-[var(--shadow-card)] border border-[var(--color-border-card)] overflow-hidden">
            <div className="p-[20px] border-b border-[var(--color-border-card)] flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[var(--color-text-secondary)]" />
              <h3 className="text-[16px] font-semibold text-[var(--color-text-main)]">Comentarios Internos</h3>
            </div>
            <div className="p-[20px] bg-[var(--color-bg-app)] flex flex-col gap-6 max-h-[400px] overflow-y-auto">
              {request.comentarios && request.comentarios.length > 0 ? (
                request.comentarios.map((comment: any) => {
                  const isOwn = comment.usuario_id === user?.id;
                  return (
                    <div key={comment.id} className={`flex gap-3 max-w-[85%] ${isOwn ? 'self-end flex-row-reverse' : 'self-start'}`}>
                      <div className="w-8 h-8 rounded-full bg-white border border-[var(--color-border-card)] flex-shrink-0 flex items-center justify-center text-[12px] font-bold text-[var(--color-text-secondary)]">
                        {comment.usuario_nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                        <div className={`flex items-baseline gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                          <span className="text-[13px] font-medium text-[var(--color-text-main)]">{comment.usuario_nombre}</span>
                          <span className="text-[11px] text-[var(--color-text-secondary)]">{format(new Date(comment.created_at), "dd MMM, HH:mm", { locale: es })}</span>
                        </div>
                        <div className={`p-3 rounded-[10px] text-[13px] ${isOwn ? 'bg-[var(--color-brand)] text-white rounded-tr-none' : 'bg-white border border-[var(--color-border-card)] text-[var(--color-text-main)] rounded-tl-none'}`}>
                          {comment.comentario}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-[13px] text-[var(--color-text-secondary)] py-4">No hay comentarios en esta solicitud.</p>
              )}
            </div>
            <div className="p-4 border-t border-[var(--color-border-card)] bg-white">
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribe un comentario o nota interna..."
                  className="flex-1 px-3 py-2 border border-[var(--color-border-input)] rounded-[7px] focus:outline-none focus:border-[var(--color-brand)] text-[13px] text-[var(--color-text-main)]"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="bg-[var(--color-brand)] text-white p-2.5 rounded-[7px] hover:bg-[#AA0000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-[10px] shadow-[var(--shadow-card)] border border-[var(--color-border-card)] overflow-hidden">
            <div className="p-[20px] border-b border-[var(--color-border-card)]">
              <h3 className="text-[16px] font-semibold text-[var(--color-text-main)]">Acciones</h3>
            </div>
            <div className="p-[20px] space-y-3">
              {user?.rol === "operador" ? (
                <>
                  {request.estado === "Borrador" && (
                    <button
                      onClick={() => handleStatusUpdate("Enviada")}
                      className="w-full bg-[var(--color-brand)] text-white font-medium py-2 px-4 rounded-[7px] hover:bg-[#AA0000] transition-colors flex items-center justify-center gap-2 text-[13px]"
                    >
                      <Send className="w-4 h-4" /> Enviar a Candeleda
                    </button>
                  )}
                  <button
                    onClick={handleSendEmail}
                    className="w-full bg-transparent border border-[var(--color-border-input)] text-[var(--color-text-main)] font-medium py-2 px-4 rounded-[7px] hover:bg-[var(--color-bg-hover)] transition-colors flex items-center justify-center gap-2 text-[13px]"
                  >
                    <Mail className="w-4 h-4" /> Reenviar por Email
                  </button>
                  {request.estado === "Borrador" && (
                    <div className="flex gap-2">
                      <Link
                        to={`/new?editId=${request.id}`}
                        className="flex-1 bg-transparent text-[var(--color-text-main)] border border-[var(--color-border-input)] font-medium py-2 px-4 rounded-[7px] hover:bg-[var(--color-bg-hover)] transition-colors flex items-center justify-center gap-2 text-[13px]"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={handleDeleteDraft}
                        className="flex-1 bg-[#FFF1F2] text-[#DC2626] border border-[#FECDD3] font-medium py-2 px-4 rounded-[7px] hover:bg-[#FFE4E6] transition-colors flex items-center justify-center gap-2 text-[13px]"
                      >
                        <Trash2 className="w-4 h-4" /> Eliminar
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleStatusUpdate("En gestión")}
                    className="w-full bg-[#D97706] text-white font-medium py-2 px-4 rounded-[7px] hover:bg-[#B45309] transition-colors flex items-center justify-center gap-2 text-[13px]"
                  >
                    <Play className="w-4 h-4" /> Iniciar Gestión
                  </button>
                  <button
                    onClick={() => handleStatusUpdate("Emitida")}
                    className="w-full bg-[#16A34A] text-white font-medium py-2 px-4 rounded-[7px] hover:bg-[#15803D] transition-colors flex items-center justify-center gap-2 text-[13px]"
                  >
                    <CheckCircle className="w-4 h-4" /> Marcar como Emitida
                  </button>
                  <button
                    onClick={handleReplyEmail}
                    className="w-full bg-white border border-[var(--color-border-input)] text-[var(--color-text-main)] font-medium py-2 px-4 rounded-[7px] hover:bg-[var(--color-bg-hover)] transition-colors flex items-center justify-center gap-2 text-[13px]"
                  >
                    <Send className="w-4 h-4" /> Responder a {delegacionOrigen}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-white rounded-[10px] shadow-[var(--shadow-card)] border border-[var(--color-border-card)] overflow-hidden">
            <div className="p-[20px] border-b border-[var(--color-border-card)] flex justify-between items-center">
              <h3 className="text-[16px] font-semibold text-[var(--color-text-main)]">Documentación</h3>
              <span className="bg-[var(--color-bg-app)] text-[var(--color-text-secondary)] px-2 py-0.5 rounded-[5px] text-[12px] font-medium">
                {request.adjuntos?.length || 0}
              </span>
            </div>
            <div className="p-[20px]">
              {request.adjuntos && request.adjuntos.length > 0 ? (
                <ul className="space-y-3">
                  {request.adjuntos.map((file: any) => (
                    <li key={file.id} className="flex items-center gap-3 p-3 rounded-[7px] border border-[var(--color-border-card)] hover:border-[var(--color-brand)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer group">
                      <FileText className="w-5 h-5 text-[var(--color-text-secondary)] group-hover:text-[var(--color-brand)]" />
                      <div className="flex-1 overflow-hidden">
                        <p className="text-[13px] font-medium text-[var(--color-text-main)] group-hover:text-[var(--color-brand)] truncate">{file.nombre_original}</p>
                        <p className="text-[12px] text-[var(--color-text-secondary)]">{(file.tamanio_bytes / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-[var(--color-text-secondary)] text-center py-4">No hay documentos adjuntos</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
