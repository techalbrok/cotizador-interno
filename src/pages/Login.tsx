import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AppButton from "../components/ui/AppButton";
import SurfaceCard from "../components/ui/SurfaceCard";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.user);
        navigate("/");
      } else {
        setError(data.message || "No se pudo iniciar sesion");
      }
    } catch (error) {
      setError("Error de conexion con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="page-shell grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <SurfaceCard className="hidden overflow-hidden border-white/50 bg-[linear-gradient(160deg,hsl(229_38%_12%),hsl(222_42%_10%)_46%,hsl(222_42%_9%))] text-white shadow-[var(--shadow-sidebar)] lg:block" padding="lg">
          <div className="relative z-10 flex h-full flex-col justify-between gap-10">
            <div>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-[linear-gradient(135deg,hsl(350_78%_50%),hsl(358_88%_58%))] shadow-[0_22px_36px_-26px_hsl(350_78%_50%_/_0.9)]">
                  <ShieldCheck className="h-8 w-8 text-white" />
                </div>
                <div>
                  <p className="text-[2rem] font-extrabold tracking-[-0.05em]">albroksa</p>
                  <p className="text-xs uppercase tracking-[0.26em] text-[hsl(221_20%_72%)]">
                    Correduria de seguros
                  </p>
                </div>
              </div>

              <div className="mt-16 max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[hsl(350_88%_72%)]">
                  Canal interno
                </p>
                <h1 className="mt-4 text-[3rem] font-extrabold leading-[1.05] tracking-[-0.06em]">
                  Operativa premium para solicitudes internas de cotizacion.
                </h1>
                <p className="mt-5 text-base leading-7 text-[hsl(221_20%_72%)]">
                  Una experiencia alineada con el ecosistema visual Albroksa, pensada para trabajar rapido,
                  con claridad y con un marco consistente entre aplicaciones.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Envio ordenado", "Solicitudes estructuradas y trazables."],
                ["Contexto compartido", "Adjuntos, comentarios y estados en un solo flujo."],
                ["Seguridad reforzada", "Sesion segura y permisos acotados."],
              ].map(([title, description]) => (
                <div key={title} className="rounded-[1.35rem] border border-white/10 bg-white/6 p-4 backdrop-blur-md">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-[hsl(221_20%_72%)]">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="mx-auto w-full max-w-xl animate-rise-in" variant="glass" padding="lg">
          <div className="relative z-10">
            <div className="mb-8 flex items-center gap-4 lg:hidden">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-[linear-gradient(135deg,hsl(350_78%_50%),hsl(358_88%_58%))] shadow-[0_20px_34px_-24px_hsl(350_78%_50%_/_0.85)]">
                <ShieldCheck className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-[1.8rem] font-extrabold tracking-[-0.05em] text-[hsl(222_38%_12%)]">albroksa</p>
                <p className="text-xs uppercase tracking-[0.22em] text-[hsl(219_18%_52%)]">Canal interno</p>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[hsl(350_78%_50%)]">
                Acceso seguro
              </p>
              <h2 className="mt-3 text-[2.1rem] font-extrabold tracking-[-0.05em] text-[hsl(222_38%_12%)]">
                Bienvenido de nuevo
              </h2>
              <p className="mt-2 text-sm leading-6 text-[hsl(219_18%_52%)]">
                Inicia sesion para continuar con la operativa interna de solicitudes.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleLogin}>
              {error && (
                <div className="rounded-[1.1rem] border border-[hsl(353_83%_60%_/_0.22)] bg-[hsl(353_83%_60%_/_0.08)] px-4 py-3 text-sm font-medium text-[hsl(353_72%_46%)]">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="form-label">
                  Correo electronico
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="form-input"
                  placeholder="usuario@albroksa.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="form-label">
                  Contrasena
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="form-input"
                  placeholder="Introduce tu contrasena"
                />
              </div>

              <div className="pt-2">
                <AppButton type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Iniciando sesion..." : "Acceder al sistema"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </AppButton>
              </div>
            </form>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
