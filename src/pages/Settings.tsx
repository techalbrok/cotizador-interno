import React, { useEffect, useMemo, useState } from "react";
import { Ban, Building, CheckCircle2, Mail, Pencil, ShieldCheck, User, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import AppButton from "../components/ui/AppButton";
import DataTableShell from "../components/ui/DataTableShell";
import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";

type UserRole = "operador" | "gestor" | "admin" | "superadmin" | "avisador" | "tramitador_central";

type AdminUser = {
  id: number;
  nombre: string;
  email: string;
  rol: UserRole;
  delegacion_id: number | null;
  delegacion_nombre?: string | null;
  activo: boolean;
  created_at: string;
  comision_pactada?: number | null;
  delegacion_asignada_id?: number | null;
};

type Delegacion = {
  id: number;
  nombre: string;
  email_contacto: string;
  activa: boolean;
};

type UserFormState = {
  nombre: string;
  email: string;
  password: string;
  rol: UserRole;
  delegacion_id: string;
  comision_pactada: string;
  delegacion_asignada_id: string;
};

type DelegacionFormState = {
  nombre: string;
  email_contacto: string;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type SmtpFormState = {
  smtp_enabled: boolean;
  smtp_host: string;
  smtp_port: string;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  smtp_from_name: string;
  smtp_from_email: string;
  smtp_password_configured: boolean;
  solicitud_destinatarios_email: string;
};

const emptyForm: UserFormState = {
  nombre: "",
  email: "",
  password: "",
  rol: "operador",
  delegacion_id: "",
  comision_pactada: "0",
  delegacion_asignada_id: "",
};

const emptyDelegacionForm: DelegacionFormState = {
  nombre: "",
  email_contacto: "",
};

const emptyPasswordForm: PasswordFormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const emptySmtpForm: SmtpFormState = {
  smtp_enabled: false,
  smtp_host: "",
  smtp_port: "587",
  smtp_secure: false,
  smtp_user: "",
  smtp_password: "",
  smtp_from_name: "",
  smtp_from_email: "",
  smtp_password_configured: false,
  solicitud_destinatarios_email: "",
};

const roleLabels: Record<UserRole, string> = {
  operador: "Operador",
  gestor: "Gestor",
  admin: "Administrador",
  superadmin: "Super administrador",
  avisador: "Avisador",
  tramitador_central: "Tramitador central",
};

export default function Settings() {
  const { user, token } = useAuth();
  const userInitials = useMemo(() => {
    const nombre = user?.nombre || "U";
    return nombre
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [user?.nombre]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [delegaciones, setDelegaciones] = useState<Delegacion[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [savingUser, setSavingUser] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [delegForm, setDelegForm] = useState<DelegacionFormState>(emptyDelegacionForm);
  const [editingDelegId, setEditingDelegId] = useState<number | null>(null);
  const [savingDeleg, setSavingDeleg] = useState(false);
  const [togglingDelegId, setTogglingDelegId] = useState<number | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(emptyPasswordForm);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [smtpForm, setSmtpForm] = useState<SmtpFormState>(emptySmtpForm);
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpError, setSmtpError] = useState("");
  const [smtpSuccess, setSmtpSuccess] = useState("");

  const isAdmin = user?.rol === "admin";

  const resetForm = () => {
    setForm(emptyForm);
    setEditingUserId(null);
    setTemporaryPassword("");
  };

  const resetDelegForm = () => {
    setDelegForm(emptyDelegacionForm);
    setEditingDelegId(null);
  };

  const handleEditDeleg = (selectedDeleg: Delegacion) => {
    setEditingDelegId(selectedDeleg.id);
    setAdminError("");
    setAdminSuccess("");
    setDelegForm({
      nombre: selectedDeleg.nombre,
      email_contacto: selectedDeleg.email_contacto,
    });
  };

  const handleSubmitDeleg = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return;

    setSavingDeleg(true);
    setAdminError("");
    setAdminSuccess("");

    try {
      if (!delegForm.nombre || !delegForm.email_contacto) {
        throw new Error("Completa nombre y email de contacto");
      }

      const response = await apiFetch(
        editingDelegId ? `/api/delegaciones/${editingDelegId}` : "/api/delegaciones",
        token,
        {
          method: editingDelegId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(delegForm),
        }
      );

      if (!response.ok) {
        throw new Error(await readResponseMessage(response));
      }

      setAdminSuccess(editingDelegId ? "Delegacion actualizada correctamente" : "Delegacion creada correctamente");
      resetDelegForm();
      await loadAdminData();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "No se pudo guardar la delegacion");
    } finally {
      setSavingDeleg(false);
    }
  };

  const handleToggleDelegActive = async (selectedDeleg: Delegacion) => {
    if (!token) return;

    setTogglingDelegId(selectedDeleg.id);
    setAdminError("");
    setAdminSuccess("");

    try {
      const response = await apiFetch(`/api/delegaciones/${selectedDeleg.id}/activo`, token, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activa: !selectedDeleg.activa }),
      });

      if (!response.ok) {
        throw new Error(await readResponseMessage(response));
      }

      setAdminSuccess(selectedDeleg.activa ? "Delegacion desactivada correctamente" : "Delegacion activada correctamente");
      await loadAdminData();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "No se pudo actualizar la delegacion");
    } finally {
      setTogglingDelegId(null);
    }
  };

  const readResponseMessage = async (res: Response) => {
    try {
      const data = await res.json();
      return data.message || "Se produjo un error";
    } catch {
      return "Se produjo un error";
    }
  };

  const loadSmtpSettings = async () => {
    if (!token) return;

    setSmtpLoading(true);
    setSmtpError("");

    try {
      const response = await apiFetch("/api/auth/smtp-settings", token);

      if (!response.ok) {
        throw new Error(await readResponseMessage(response));
      }

      const data = await response.json();
      setSmtpForm({
        smtp_enabled: Boolean(data.smtp_enabled),
        smtp_host: data.smtp_host || "",
        smtp_port: String(data.smtp_port || 587),
        smtp_secure: Boolean(data.smtp_secure),
        smtp_user: data.smtp_user || "",
        smtp_password: "",
        smtp_from_name: data.smtp_from_name || "",
        smtp_from_email: data.smtp_from_email || "",
        smtp_password_configured: Boolean(data.smtp_password_configured),
        solicitud_destinatarios_email: data.solicitud_destinatarios_email || "",
      });
    } catch (error) {
      setSmtpError(error instanceof Error ? error.message : "No se pudo cargar la configuracion SMTP");
    } finally {
      setSmtpLoading(false);
    }
  };

  const loadAdminData = async () => {
    if (!isAdmin || !token) return;

    setAdminLoading(true);
    setAdminError("");

    try {
      const [usersRes, delegacionesRes] = await Promise.all([
        apiFetch("/api/usuarios", token),
        apiFetch("/api/delegaciones", token),
      ]);

      if (!usersRes.ok) {
        throw new Error(await readResponseMessage(usersRes));
      }

      if (!delegacionesRes.ok) {
        throw new Error(await readResponseMessage(delegacionesRes));
      }

      const [usersData, delegacionesData] = await Promise.all([
        usersRes.json(),
        delegacionesRes.json(),
      ]);

      setUsers(usersData);
      setDelegaciones(delegacionesData);
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "No se pudo cargar la administracion");
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [isAdmin, token]);

  useEffect(() => {
    loadSmtpSettings();
  }, [token]);

  useEffect(() => {
    if (!adminSuccess || temporaryPassword) return;

    const timeout = window.setTimeout(() => setAdminSuccess(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [adminSuccess, temporaryPassword]);

  useEffect(() => {
    if (!passwordSuccess) return;

    const timeout = window.setTimeout(() => setPasswordSuccess(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [passwordSuccess]);

  useEffect(() => {
    if (!smtpSuccess) return;

    const timeout = window.setTimeout(() => setSmtpSuccess(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [smtpSuccess]);

  const handleFormChange = (field: keyof UserFormState, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "rol" && (value === "admin" || value === "superadmin")) {
        next.delegacion_id = "";
      }
      if (field === "rol" && value !== "avisador") {
        next.delegacion_asignada_id = "";
      }
      return next;
    });
  };

  const handlePasswordFormChange = (field: keyof PasswordFormState, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSmtpFormChange = (field: keyof SmtpFormState, value: string | boolean) => {
    setSmtpForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditUser = (selectedUser: AdminUser) => {
    setEditingUserId(selectedUser.id);
    setAdminError("");
    setAdminSuccess("");
    setTemporaryPassword("");
    setForm({
      nombre: selectedUser.nombre,
      email: selectedUser.email,
      password: "",
      rol: selectedUser.rol,
      delegacion_id: selectedUser.delegacion_id ? String(selectedUser.delegacion_id) : "",
      comision_pactada: selectedUser.comision_pactada != null ? String(selectedUser.comision_pactada) : "0",
      delegacion_asignada_id: selectedUser.delegacion_asignada_id ? String(selectedUser.delegacion_asignada_id) : "",
    });
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return;

    setSavingUser(true);
    setAdminError("");
    setAdminSuccess("");
    setTemporaryPassword("");

    try {
      if (!form.nombre || !form.email || !form.rol) {
        throw new Error("Completa nombre, email y rol");
      }

      if (!editingUserId && !form.password) {
        throw new Error("La contrasena es obligatoria para crear un usuario");
      }

      if (form.rol !== "admin" && form.rol !== "superadmin" && !form.delegacion_id) {
        throw new Error("Selecciona una delegacion para operadores, gestores, avisadores y tramitadores");
      }

      if (form.rol === "avisador" && !form.delegacion_asignada_id) {
        throw new Error("Selecciona la delegacion asignada para el avisador");
      }

      const payload: Record<string, string | number | null> = {
        nombre: form.nombre,
        email: form.email,
        rol: form.rol,
        delegacion_id: (form.rol === "admin" || form.rol === "superadmin") ? null : Number(form.delegacion_id),
      };

      if (form.rol === "avisador") {
        payload.comision_pactada = form.comision_pactada ? Number(form.comision_pactada) : 0;
        payload.delegacion_asignada_id = form.delegacion_asignada_id ? Number(form.delegacion_asignada_id) : null;
      }

      if (!editingUserId) {
        payload.password = form.password;
      } else if (form.password) {
        payload.password = form.password;
      }

      const response = await apiFetch(editingUserId ? `/api/usuarios/${editingUserId}` : "/api/usuarios", token, {
        method: editingUserId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readResponseMessage(response));
      }

      setAdminSuccess(editingUserId ? "Usuario actualizado correctamente" : "Usuario creado correctamente");
      resetForm();
      await loadAdminData();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "No se pudo guardar el usuario");
    } finally {
      setSavingUser(false);
    }
  };

  const handleToggleActive = async (selectedUser: AdminUser) => {
    if (!token) return;

    setAdminError("");
    setAdminSuccess("");
    setTemporaryPassword("");

    try {
      const response = await apiFetch(`/api/usuarios/${selectedUser.id}/activo`, token, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !selectedUser.activo }),
      });

      if (!response.ok) {
        throw new Error(await readResponseMessage(response));
      }

      setAdminSuccess(selectedUser.activo ? "Usuario desactivado correctamente" : "Usuario activado correctamente");
      await loadAdminData();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "No se pudo actualizar el usuario");
    }
  };

  const handleResetPassword = async (selectedUser: AdminUser) => {
    if (!token) return;

    setResettingUserId(selectedUser.id);
    setAdminError("");
    setAdminSuccess("");
    setTemporaryPassword("");

    try {
      const response = await apiFetch(`/api/usuarios/${selectedUser.id}/reset-password`, token, { method: "POST" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "No se pudo resetear la contrasena");
      }

      setAdminSuccess(`Contrasena temporal regenerada para ${selectedUser.nombre}`);
      setTemporaryPassword(data.temporaryPassword || "");
      await loadAdminData();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "No se pudo resetear la contrasena");
    } finally {
      setResettingUserId(null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return;

    setChangingPassword(true);
    setPasswordError("");
    setPasswordSuccess("");

    try {
      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        throw new Error("Completa los tres campos de contrasena");
      }

      if (passwordForm.newPassword.length < 8) {
        throw new Error("La nueva contrasena debe tener al menos 8 caracteres");
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error("La nueva contrasena y su confirmacion no coinciden");
      }

      const response = await apiFetch("/api/auth/change-password", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });

      if (!response.ok) {
        throw new Error(await readResponseMessage(response));
      }

      setPasswordSuccess("Contrasena actualizada correctamente");
      setPasswordForm(emptyPasswordForm);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "No se pudo actualizar la contrasena");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveSmtpSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return;

    setSavingSmtp(true);
    setSmtpError("");
    setSmtpSuccess("");

    try {
      if (!smtpForm.smtp_port.trim()) {
        throw new Error("Indica un puerto SMTP valido");
      }

      const response = await apiFetch("/api/auth/smtp-settings", token, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtp_enabled: smtpForm.smtp_enabled,
          smtp_host: smtpForm.smtp_host,
          smtp_port: Number(smtpForm.smtp_port),
          smtp_secure: smtpForm.smtp_secure,
          smtp_user: smtpForm.smtp_user,
          smtp_password: smtpForm.smtp_password,
          smtp_from_name: smtpForm.smtp_from_name,
          smtp_from_email: smtpForm.smtp_from_email,
          solicitud_destinatarios_email: smtpForm.solicitud_destinatarios_email,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "No se pudo guardar la configuracion SMTP");
      }

      setSmtpSuccess("Configuracion SMTP guardada correctamente");
      setSmtpForm({
        smtp_enabled: Boolean(data.settings?.smtp_enabled),
        smtp_host: data.settings?.smtp_host || "",
        smtp_port: String(data.settings?.smtp_port || 587),
        smtp_secure: Boolean(data.settings?.smtp_secure),
        smtp_user: data.settings?.smtp_user || "",
        smtp_password: "",
        smtp_from_name: data.settings?.smtp_from_name || "",
        smtp_from_email: data.settings?.smtp_from_email || "",
        smtp_password_configured: Boolean(data.settings?.smtp_password_configured),
        solicitud_destinatarios_email: data.settings?.solicitud_destinatarios_email || "",
      });
    } catch (error) {
      setSmtpError(error instanceof Error ? error.message : "No se pudo guardar la configuracion SMTP");
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtpSettings = async () => {
    if (!token) return;

    setTestingSmtp(true);
    setSmtpError("");
    setSmtpSuccess("");
    let timeout: number | undefined;

    try {
      const controller = new AbortController();
      timeout = window.setTimeout(() => controller.abort(), 16000);

      const response = await apiFetch("/api/auth/smtp-settings/test", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          smtp_enabled: smtpForm.smtp_enabled,
          smtp_host: smtpForm.smtp_host,
          smtp_port: Number(smtpForm.smtp_port),
          smtp_secure: smtpForm.smtp_secure,
          smtp_user: smtpForm.smtp_user,
          smtp_password: smtpForm.smtp_password,
          smtp_from_name: smtpForm.smtp_from_name,
          smtp_from_email: smtpForm.smtp_from_email,
          solicitud_destinatarios_email: smtpForm.solicitud_destinatarios_email,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "No se pudo probar la configuracion SMTP");
      }
      if (data.success === false) {
        throw new Error(data.message || "No se pudo probar la configuracion SMTP");
      }

      setSmtpSuccess(`SMTP verificado correctamente (${data.result?.host}:${data.result?.port})`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setSmtpError("La prueba SMTP ha superado el tiempo de espera. Revisa host, puerto y conectividad.");
      } else {
        setSmtpError(error instanceof Error ? error.message : "No se pudo probar la configuracion SMTP");
      }
    } finally {
      if (timeout) {
        window.clearTimeout(timeout);
      }
      setTestingSmtp(false);
    }
  };

  return (
    <div className="page-shell space-y-4 pb-4">
      <PageHeader
        title="Configuracion"
        subtitle="Gestiona tu perfil, seguridad, correo saliente y administracion con el mismo lenguaje visual del ecosistema Albroksa."
        icon={ShieldCheck}
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="Perfil de usuario"
          description="Informacion principal de la cuenta y asignacion operativa actual."
          icon={User}
        >
          <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
            <div className="rounded-lg border border-[hsl(220_14%_88%_/_0.85)] bg-[linear-gradient(145deg,hsl(350_78%_50%_/_0.06),rgba(255,255,255,0.92),hsl(225_50%_52%_/_0.06))] p-3">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(226_46%_40%)] to-[hsl(232_46%_52%)] text-[1.1rem] font-semibold text-white shadow-[0_4px_10px_rgba(53,77,163,0.22)]">
                  {userInitials || user?.nombre?.charAt(0).toUpperCase() || "U"}
                </div>
                <h3 className="mt-2 text-[0.9rem] font-semibold tracking-[-0.01em] text-[hsl(222_38%_12%)] leading-tight">
                  {user?.nombre || "Usuario"}
                </h3>
                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-[hsl(350_78%_50%_/_0.18)] bg-[hsl(350_78%_50%_/_0.08)] px-2 py-0.5 text-[0.7rem] font-semibold text-[hsl(350_78%_44%)] capitalize">
                  <ShieldCheck className="h-3 w-3" />
                  {user?.rol || "Sin rol"}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="form-label">Delegacion</label>
                <div className="form-input flex items-center gap-2.5 bg-[hsl(220_22%_97%_/_0.5)] cursor-default">
                  <Building className="h-3.5 w-3.5 text-[hsl(219_14%_46%)]" />
                  <span className="truncate">{user?.delegacion_nombre || "Sede Central"}</span>
                </div>
              </div>
              <div>
                <label className="form-label">Correo electronico</label>
                <div className="form-input flex items-center gap-2.5 bg-[hsl(220_22%_97%_/_0.5)] cursor-default">
                  <Mail className="h-3.5 w-3.5 text-[hsl(219_14%_46%)]" />
                  <span className="truncate">{user?.email || "-"}</span>
                </div>
              </div>
              <div>
                <label className="form-label">Rol operativo</label>
                <div className="form-input bg-[hsl(220_22%_97%_/_0.5)] cursor-default capitalize">{user?.rol || "-"}</div>
              </div>
              <div>
                <label className="form-label">Estado de acceso</label>
                <div className="form-input bg-[hsl(220_22%_97%_/_0.5)] cursor-default">Activo</div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Seguridad"
          description="Actualiza tu contrasena para mantener el acceso protegido."
          icon={ShieldCheck}
        >
          <form className="space-y-3" onSubmit={handleChangePassword}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="form-label">Contrasena actual</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => handlePasswordFormChange("currentPassword", e.target.value)}
                  className="form-input"
                  placeholder="Introduce tu contrasena actual"
                />
              </div>
              <div>
                <label className="form-label">Nueva contrasena</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => handlePasswordFormChange("newPassword", e.target.value)}
                  className="form-input"
                  placeholder="Minimo 8 caracteres"
                />
              </div>
              <div>
                <label className="form-label">Confirmar contrasena</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => handlePasswordFormChange("confirmPassword", e.target.value)}
                  className="form-input"
                  placeholder="Repite la nueva contrasena"
                />
              </div>
            </div>

            {(passwordError || passwordSuccess) && (
              <div className="space-y-2">
                {passwordError && (
                  <div className="rounded-md border border-[hsl(353_78%_52%_/_0.22)] bg-[hsl(353_78%_52%_/_0.08)] px-3 py-2 text-[0.8rem] font-medium text-[hsl(353_72%_44%)]">
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="rounded-md border border-[hsl(152_58%_38%_/_0.22)] bg-[hsl(152_58%_38%_/_0.08)] px-3 py-2 text-[0.8rem] font-medium text-[hsl(152_58%_30%)]">
                    {passwordSuccess}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <AppButton type="submit" disabled={changingPassword}>
                {changingPassword ? "Actualizando..." : "Cambiar contrasena"}
              </AppButton>
            </div>
          </form>
        </SectionCard>
      </div>

      <SectionCard
        title="SMTP personal"
        description="Configura la cuenta de correo desde la que se enviaran tus solicitudes y prueba la conectividad antes de usarla."
        icon={Mail}
      >
        <div className="space-y-4">
            <div className="flex flex-col justify-between gap-3 rounded-lg border border-[hsl(220_14%_88%_/_0.85)] bg-white px-3 py-2.5 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-semibold text-[hsl(222_38%_12%)]">Usar mi cuenta SMTP para enviar solicitudes</p>
              <p className="mt-1 text-sm text-[hsl(219_18%_52%)]">
                Si esta opcion esta desactivada, la aplicacion seguira usando el SMTP global configurado en el servidor.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center self-start md:self-auto">
              <input
                type="checkbox"
                checked={smtpForm.smtp_enabled}
                onChange={(e) => handleSmtpFormChange("smtp_enabled", e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-[hsl(220_14%_88%)] transition-colors peer-checked:bg-[hsl(350_78%_50%)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(10,16,34,0.18)] after:transition-transform after:duration-200 peer-checked:after:translate-x-5" />
            </label>
          </div>

          <form className="space-y-5" onSubmit={handleSaveSmtpSettings}>
            <div className="grid gap-3 xl:grid-cols-[1.25fr_0.75fr_240px]">
              <div>
                <label className="form-label">Host SMTP</label>
                <input
                  value={smtpForm.smtp_host}
                  onChange={(e) => handleSmtpFormChange("smtp_host", e.target.value)}
                  className="form-input"
                  placeholder="smtp.tudominio.com"
                />
              </div>
              <div>
                <label className="form-label">Puerto</label>
                <input
                  value={smtpForm.smtp_port}
                  onChange={(e) => handleSmtpFormChange("smtp_port", e.target.value)}
                  className="form-input"
                  placeholder="587"
                />
              </div>
              <div>
                <label className="form-label">Seguridad</label>
                <label className="form-input flex items-center gap-3 bg-white/75">
                  <input
                    type="checkbox"
                    checked={smtpForm.smtp_secure}
                    onChange={(e) => handleSmtpFormChange("smtp_secure", e.target.checked)}
                    className="h-4 w-4 rounded border-[hsl(220_16%_86%)]"
                  />
                  <span>Usar TLS/STARTTLS</span>
                </label>
              </div>
            </div>

            <p className="text-sm text-[hsl(219_18%_52%)]">
              Recomendacion practica: puerto <span className="font-semibold text-[hsl(222_38%_12%)]">465</span> con TLS activado, o puerto <span className="font-semibold text-[hsl(222_38%_12%)]">587</span> con TLS activado para STARTTLS.
            </p>

            {smtpForm.smtp_port.trim() === "465" && !smtpForm.smtp_secure && (
              <div className="rounded-md border border-[hsl(33_90%_50%_/_0.22)] bg-[hsl(33_90%_50%_/_0.08)] px-3 py-2 text-[0.8rem] font-medium text-[hsl(28_88%_36%)]">
                El puerto 465 requiere TLS activado.
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="form-label">Usuario SMTP</label>
                <input
                  value={smtpForm.smtp_user}
                  onChange={(e) => handleSmtpFormChange("smtp_user", e.target.value)}
                  className="form-input"
                  placeholder="tu-correo@dominio.com"
                />
              </div>
              <div>
                <label className="form-label">Contrasena SMTP</label>
                <input
                  type="password"
                  value={smtpForm.smtp_password}
                  onChange={(e) => handleSmtpFormChange("smtp_password", e.target.value)}
                  className="form-input"
                  placeholder={smtpForm.smtp_password_configured ? "Dejar en blanco para mantener la guardada" : "Introduce la contrasena SMTP"}
                />
                {smtpForm.smtp_password_configured && (
                  <p className="mt-2 text-xs text-[hsl(219_18%_52%)]">Ya hay una contrasena SMTP guardada para este perfil.</p>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="form-label">Nombre del remitente</label>
                <input
                  value={smtpForm.smtp_from_name}
                  onChange={(e) => handleSmtpFormChange("smtp_from_name", e.target.value)}
                  className="form-input"
                  placeholder="Tu nombre o delegacion"
                />
              </div>
              <div>
                <label className="form-label">Email remitente</label>
                <input
                  type="email"
                  value={smtpForm.smtp_from_email}
                  onChange={(e) => handleSmtpFormChange("smtp_from_email", e.target.value)}
                  className="form-input"
                  placeholder="Opcional, por defecto usa el usuario SMTP"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Destinatarios de solicitudes</label>
              <textarea
                value={smtpForm.solicitud_destinatarios_email}
                onChange={(e) => handleSmtpFormChange("solicitud_destinatarios_email", e.target.value)}
                className="form-input min-h-[96px] resize-y"
                placeholder="Uno o varios emails separados por comas o saltos de linea"
              />
              <p className="mt-2 text-sm text-[hsl(219_18%_52%)]">
                Si lo dejas vacio, la solicitud se enviara al destinatario por defecto configurado actualmente.
              </p>
            </div>

            {(smtpLoading || smtpError || smtpSuccess) && (
              <div className="space-y-3">
                {smtpLoading && (
                  <div className="rounded-md border border-[hsl(216_90%_62%_/_0.18)] bg-[hsl(216_90%_62%_/_0.08)] px-3 py-2 text-[0.8rem] font-medium text-[hsl(216_90%_40%)]">
                    Cargando configuracion SMTP...
                  </div>
                )}
                {smtpError && (
                  <div className="rounded-md border border-[hsl(353_78%_52%_/_0.22)] bg-[hsl(353_78%_52%_/_0.08)] px-3 py-2 text-[0.8rem] font-medium text-[hsl(353_72%_44%)]">
                    {smtpError}
                  </div>
                )}
                {smtpSuccess && (
                  <div className="rounded-md border border-[hsl(152_58%_38%_/_0.22)] bg-[hsl(152_58%_38%_/_0.08)] px-3 py-2 text-[0.8rem] font-medium text-[hsl(152_58%_30%)]">
                    {smtpSuccess}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm text-[hsl(219_18%_52%)]">
                Los nuevos envios usaran esta cuenta cuando la opcion este activa.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <AppButton variant="secondary" onClick={handleTestSmtpSettings} disabled={testingSmtp || savingSmtp || smtpLoading}>
                  {testingSmtp ? "Probando..." : "Probar SMTP"}
                </AppButton>
                <AppButton type="submit" disabled={savingSmtp || testingSmtp || smtpLoading}>
                  {savingSmtp ? "Guardando..." : "Guardar SMTP"}
                </AppButton>
              </div>
            </div>
          </form>
        </div>
      </SectionCard>

      {isAdmin && (
        <div className="space-y-6">
          {(adminError || adminSuccess) && (
            <div className="space-y-3">
              {adminError && (
                <div className="rounded-md border border-[hsl(353_78%_52%_/_0.22)] bg-[hsl(353_78%_52%_/_0.08)] px-3 py-2 text-[0.8rem] font-medium text-[hsl(353_72%_44%)]">
                  {adminError}
                </div>
              )}
              {adminSuccess && (
                <div className="rounded-[1rem] border border-[hsl(152_58%_42%_/_0.18)] bg-[hsl(152_58%_42%_/_0.08)] px-4 py-3 text-sm font-semibold text-[hsl(152_58%_30%)]">
                  <p>{adminSuccess}</p>
                  {temporaryPassword && (
                    <p className="mt-2">
                      Clave temporal:{" "}
                      <span className="rounded-lg bg-white/80 px-2 py-1 font-mono text-xs text-[hsl(222_38%_12%)]">
                        {temporaryPassword}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
            <SectionCard
              title={editingUserId ? "Editar usuario" : "Nuevo usuario"}
              description="Alta y mantenimiento de usuarios, roles y delegaciones."
              icon={UserPlus}
              actions={
                editingUserId ? (
                  <AppButton variant="secondary" onClick={resetForm}>
                    Cancelar edicion
                  </AppButton>
                ) : undefined
              }
            >
              <form className="space-y-5" onSubmit={handleSubmitUser}>
                <div>
                  <label className="form-label">Nombre</label>
                  <input
                    value={form.nombre}
                    onChange={(e) => handleFormChange("nombre", e.target.value)}
                    className="form-input"
                    placeholder="Nombre del usuario"
                  />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleFormChange("email", e.target.value)}
                    className="form-input"
                    placeholder="usuario@albroksa.com"
                  />
                </div>
                <div>
                  <label className="form-label">{editingUserId ? "Nueva contrasena" : "Contrasena inicial"}</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => handleFormChange("password", e.target.value)}
                    className="form-input"
                    placeholder={editingUserId ? "Dejar en blanco para mantener la actual" : "Contrasena temporal"}
                  />
                  {editingUserId && (
                    <p className="mt-2 text-xs text-[hsl(219_18%_52%)]">Si la dejas vacia, se mantiene la contrasena actual.</p>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="form-label">Rol</label>
                    <select
                      value={form.rol}
                      onChange={(e) => handleFormChange("rol", e.target.value)}
                      className="form-select"
                    >
                      <option value="operador">Operador</option>
                      <option value="gestor">Gestor</option>
                      <option value="admin">Administrador</option>
                      <option value="superadmin">Super administrador</option>
                      <option value="avisador">Avisador</option>
                      <option value="tramitador_central">Tramitador central</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Delegacion</label>
                    <select
                      value={form.delegacion_id}
                      onChange={(e) => handleFormChange("delegacion_id", e.target.value)}
                      disabled={form.rol === "admin" || form.rol === "superadmin"}
                      className="form-select"
                    >
                      <option value="">{(form.rol === "admin" || form.rol === "superadmin") ? "No aplica" : "Seleccionar delegacion"}</option>
                      {delegaciones.filter((delegacion) => delegacion.activa).map((delegacion) => (
                        <option key={delegacion.id} value={delegacion.id}>
                          {delegacion.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {form.rol === "avisador" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="form-label">Comision pactada (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={form.comision_pactada}
                        onChange={(e) => handleFormChange("comision_pactada", e.target.value)}
                        className="form-input"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="form-label">Delegacion asignada</label>
                      <select
                        value={form.delegacion_asignada_id}
                        onChange={(e) => handleFormChange("delegacion_asignada_id", e.target.value)}
                        className="form-select"
                      >
                        <option value="">Seleccionar delegacion</option>
                        {delegaciones.filter((delegacion) => delegacion.activa).map((delegacion) => (
                          <option key={delegacion.id} value={delegacion.id}>
                            {delegacion.nombre}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-[hsl(219_18%_52%)]">El avisador pasara sus avisos a esta delegacion para su tramitacion.</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  {editingUserId && (
                    <AppButton variant="secondary" onClick={resetForm}>
                      Cancelar
                    </AppButton>
                  )}
                  <AppButton type="submit" disabled={savingUser}>
                    {savingUser ? "Guardando..." : editingUserId ? "Actualizar usuario" : "Crear usuario"}
                  </AppButton>
                </div>
              </form>
            </SectionCard>

            <DataTableShell
              title="Usuarios"
              description="Gestion centralizada de cuentas, estado y credenciales temporales."
              actions={<span className="text-sm font-semibold text-[hsl(219_18%_52%)]">{users.length} registrados</span>}
            >
              {adminLoading ? (
                <div className="px-5 py-8 text-sm text-[hsl(219_18%_52%)] sm:px-6">Cargando usuarios...</div>
              ) : (
                <>
                  <div className="hidden md:block">
                    <table className="data-table min-w-full">
                      <thead>
                        <tr>
                          <th>Usuario</th>
                          <th>Rol</th>
                          <th>Delegacion</th>
                          <th>Estado</th>
                          <th className="text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((listedUser) => (
                          <tr key={listedUser.id}>
                            <td>
                              <div>
                                <p className="font-semibold text-[hsl(222_38%_12%)]">{listedUser.nombre}</p>
                                <p className="mt-1 text-xs text-[hsl(219_18%_52%)]">{listedUser.email}</p>
                              </div>
                            </td>
                            <td>{roleLabels[listedUser.rol]}</td>
                            <td>{listedUser.delegacion_nombre || "Sede Central"}</td>
                            <td>
                              <span
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                                  listedUser.activo
                                    ? "bg-[hsl(152_58%_42%_/_0.1)] text-[hsl(152_58%_30%)]"
                                    : "bg-[hsl(353_83%_60%_/_0.1)] text-[hsl(353_72%_46%)]"
                                }`}
                              >
                                {listedUser.activo ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                                {listedUser.activo ? "Activo" : "Inactivo"}
                              </span>
                            </td>
                            <td>
                              <div className="flex justify-end gap-2">
                                <AppButton variant="secondary" size="sm" onClick={() => handleEditUser(listedUser)}>
                                  <Pencil className="h-4 w-4" />
                                  Editar
                                </AppButton>
                                <AppButton
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleResetPassword(listedUser)}
                                  disabled={resettingUserId === listedUser.id}
                                >
                                  {resettingUserId === listedUser.id ? "Reseteando..." : "Resetear clave"}
                                </AppButton>
                                <AppButton
                                  variant={listedUser.activo ? "danger" : "secondary"}
                                  size="sm"
                                  onClick={() => handleToggleActive(listedUser)}
                                >
                                  {listedUser.activo ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                  {listedUser.activo ? "Desactivar" : "Activar"}
                                </AppButton>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-4 p-5 md:hidden">
                    {users.map((listedUser) => (
                      <div
                        key={listedUser.id}
                        className="rounded-lg border border-[hsl(220_14%_88%_/_0.85)] bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[hsl(222_38%_12%)]">{listedUser.nombre}</p>
                            <p className="mt-1 text-xs text-[hsl(219_18%_52%)]">{listedUser.email}</p>
                          </div>
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                              listedUser.activo
                                ? "bg-[hsl(152_58%_42%_/_0.1)] text-[hsl(152_58%_30%)]"
                                : "bg-[hsl(353_83%_60%_/_0.1)] text-[hsl(353_72%_46%)]"
                            }`}
                          >
                            {listedUser.activo ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-2 text-sm text-[hsl(219_18%_52%)]">
                          <p><span className="font-semibold text-[hsl(222_38%_12%)]">Rol:</span> {roleLabels[listedUser.rol]}</p>
                          <p><span className="font-semibold text-[hsl(222_38%_12%)]">Delegacion:</span> {listedUser.delegacion_nombre || "Sede Central"}</p>
                        </div>
                        <div className="mt-4 flex flex-col gap-2">
                          <AppButton variant="secondary" size="sm" onClick={() => handleEditUser(listedUser)}>
                            <Pencil className="h-4 w-4" />
                            Editar
                          </AppButton>
                          <AppButton
                            variant="secondary"
                            size="sm"
                            onClick={() => handleResetPassword(listedUser)}
                            disabled={resettingUserId === listedUser.id}
                          >
                            {resettingUserId === listedUser.id ? "Reseteando..." : "Resetear clave"}
                          </AppButton>
                          <AppButton
                            variant={listedUser.activo ? "danger" : "secondary"}
                            size="sm"
                            onClick={() => handleToggleActive(listedUser)}
                          >
                            {listedUser.activo ? "Desactivar" : "Activar"}
                          </AppButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </DataTableShell>
          </div>

          <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)] mt-4">
            <SectionCard
              title={editingDelegId ? "Editar delegacion" : "Nueva delegacion"}
              description="Alta y edicion de delegaciones operativas."
              icon={Building}
              actions={
                editingDelegId ? (
                  <AppButton variant="secondary" onClick={resetDelegForm}>
                    Cancelar edicion
                  </AppButton>
                ) : undefined
              }
            >
              <form className="space-y-5" onSubmit={handleSubmitDeleg}>
                <div>
                  <label className="form-label">Nombre</label>
                  <input
                    value={delegForm.nombre}
                    onChange={(e) => setDelegForm(prev => ({ ...prev, nombre: e.target.value }))}
                    className="form-input"
                    placeholder="Nombre de la delegacion"
                  />
                </div>
                <div>
                  <label className="form-label">Email de contacto</label>
                  <input
                    type="email"
                    value={delegForm.email_contacto}
                    onChange={(e) => setDelegForm(prev => ({ ...prev, email_contacto: e.target.value }))}
                    className="form-input"
                    placeholder="delegacion@albroksa.com"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  {editingDelegId && (
                    <AppButton variant="secondary" onClick={resetDelegForm}>
                      Cancelar
                    </AppButton>
                  )}
                  <AppButton type="submit" disabled={savingDeleg}>
                    {savingDeleg ? "Guardando..." : editingDelegId ? "Actualizar delegacion" : "Crear delegacion"}
                  </AppButton>
                </div>
              </form>
            </SectionCard>

            <DataTableShell
              title="Delegaciones"
              description="Gestion centralizada de delegaciones operativas."
              actions={<span className="text-sm font-semibold text-[hsl(219_18%_52%)]">{delegaciones.length} registradas</span>}
            >
              {adminLoading ? (
                <div className="px-5 py-8 text-sm text-[hsl(219_18%_52%)] sm:px-6">Cargando delegaciones...</div>
              ) : (
                <>
                  <div className="hidden md:block">
                    <table className="data-table min-w-full">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Email de Contacto</th>
                          <th>Estado</th>
                          <th className="text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {delegaciones.map((listedDeleg) => (
                          <tr key={listedDeleg.id}>
                            <td>
                              <span className="font-semibold text-[hsl(222_38%_12%)]">{listedDeleg.nombre}</span>
                            </td>
                            <td>{listedDeleg.email_contacto}</td>
                            <td>
                              <span
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                                  listedDeleg.activa
                                    ? "bg-[hsl(152_58%_42%_/_0.1)] text-[hsl(152_58%_30%)]"
                                    : "bg-[hsl(353_83%_60%_/_0.1)] text-[hsl(353_72%_46%)]"
                                }`}
                              >
                                {listedDeleg.activa ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                                {listedDeleg.activa ? "Activa" : "Inactiva"}
                              </span>
                            </td>
                            <td>
                              <div className="flex justify-end gap-2">
                                <AppButton variant="secondary" size="sm" onClick={() => handleEditDeleg(listedDeleg)}>
                                  <Pencil className="h-4 w-4" />
                                  Editar
                                </AppButton>
                                <AppButton
                                  variant={listedDeleg.activa ? "danger" : "secondary"}
                                  size="sm"
                                  onClick={() => handleToggleDelegActive(listedDeleg)}
                                  disabled={togglingDelegId === listedDeleg.id}
                                >
                                  {listedDeleg.activa ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                  {listedDeleg.activa ? "Desactivar" : "Activar"}
                                </AppButton>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-4 p-5 md:hidden">
                    {delegaciones.map((listedDeleg) => (
                      <div
                        key={listedDeleg.id}
                        className="rounded-lg border border-[hsl(220_14%_88%_/_0.85)] bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[hsl(222_38%_12%)]">{listedDeleg.nombre}</p>
                            <p className="mt-1 text-xs text-[hsl(219_18%_52%)]">{listedDeleg.email_contacto}</p>
                          </div>
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                              listedDeleg.activa
                                ? "bg-[hsl(152_58%_42%_/_0.1)] text-[hsl(152_58%_30%)]"
                                : "bg-[hsl(353_83%_60%_/_0.1)] text-[hsl(353_72%_46%)]"
                            }`}
                          >
                            {listedDeleg.activa ? "Activa" : "Inactiva"}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-col gap-2">
                          <AppButton variant="secondary" size="sm" onClick={() => handleEditDeleg(listedDeleg)}>
                            <Pencil className="h-4 w-4" />
                            Editar
                          </AppButton>
                          <AppButton
                            variant={listedDeleg.activa ? "danger" : "secondary"}
                            size="sm"
                            onClick={() => handleToggleDelegActive(listedDeleg)}
                            disabled={togglingDelegId === listedDeleg.id}
                          >
                            {listedDeleg.activa ? "Desactivar" : "Activar"}
                          </AppButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </DataTableShell>
          </div>
        </div>
      )}

      <SectionCard
        title="Preferencias de notificacion"
        description="Ajustes rapidos del comportamiento de avisos dentro del area privada."
        icon={Mail}
      >
        <div className="space-y-4">
          {[
            "Recibir alertas por correo de nuevas solicitudes",
            "Notificar cambios de estado en mis solicitudes",
          ].map((label) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 rounded-lg border border-[hsl(220_14%_88%_/_0.85)] bg-white px-3 py-2.5"
            >
              <span className="text-sm font-semibold text-[hsl(222_38%_12%)]">{label}</span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" defaultChecked className="peer sr-only" />
                <div className="h-7 w-13 rounded-full bg-[hsl(220_16%_86%)] transition peer-checked:bg-[linear-gradient(135deg,hsl(350_78%_50%),hsl(358_88%_58%))] after:absolute after:left-[3px] after:top-[3px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-6" />
              </label>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
