import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  Search,
  Send,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { InsuranceType, RequestStatus } from "../types";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import { insuranceTypeMeta } from "../lib/ui";
import AppButton from "../components/ui/AppButton";
import DataTableShell from "../components/ui/DataTableShell";
import EmptyState from "../components/ui/EmptyState";
import MetricCard from "../components/ui/MetricCard";
import PageHeader from "../components/ui/PageHeader";
import StatusBadge from "../components/ui/StatusBadge";
import SurfaceCard from "../components/ui/SurfaceCard";

type DashboardRequest = {
  id: number;
  referencia: string;
  ramo: InsuranceType;
  estado: RequestStatus;
  created_at: string;
  creador_nombre: string;
  datos_formulario?: Record<string, unknown>;
};

type DashboardStats = {
  porEstado?: Array<{ estado: RequestStatus; total: number }>;
};

const getClientName = (request: DashboardRequest) => (
  String(request.datos_formulario?.nombre_cliente || request.creador_nombre || "Cliente")
);

export default function Dashboard() {
  const { user, token } = useAuth();
  const [requests, setRequests] = useState<DashboardRequest[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "Todos">("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const itemsPerPage = 10;

  useEffect(() => {
    if (!token) return;

    setLoading(true);

    const queryParams = new URLSearchParams({
      page: String(currentPage),
      limit: String(itemsPerPage),
    });

    if (statusFilter !== "Todos") {
      queryParams.append("estado", statusFilter);
    }

    apiFetch(`/api/solicitudes?${queryParams.toString()}`, token)
      .then((res) => res.json())
      .then((data) => {
        setRequests(data.data || []);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.total || 0);
      })
      .catch((error) => {
        console.error("Error fetching requests:", error);
      })
      .finally(() => setLoading(false));
  }, [token, currentPage, statusFilter]);

  useEffect(() => {
    if (!token) return;

    apiFetch("/api/dashboard", token)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((error) => console.error("Error fetching stats:", error));
  }, [token]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalByStatus = (status: RequestStatus) => {
    const item = stats?.porEstado?.find((entry) => entry.estado === status);
    return item?.total || 0;
  };

  const totalRequests = useMemo(
    () => (stats?.porEstado || []).reduce((total, current) => total + current.total, 0),
    [stats]
  );

  const filteredRequests = requests.filter((request) => {
    const needle = search.toLowerCase();
    if (!needle) return true;
    return (
      request.referencia.toLowerCase().includes(needle)
      || request.ramo.toLowerCase().includes(needle)
      || getClientName(request).toLowerCase().includes(needle)
    );
  });

  const quickActions = Object.entries(insuranceTypeMeta) as Array<[InsuranceType, typeof insuranceTypeMeta[InsuranceType]]>;

  const metrics = [
    {
      label: "Solicitudes totales",
      value: totalRequests,
      description: "Volumen acumulado del canal interno.",
      icon: FileText,
      tone: "neutral" as const,
    },
    {
      label: "En curso",
      value: totalByStatus("Enviada") + totalByStatus("En gestión"),
      description: "Pendientes de seguimiento o respuesta.",
      icon: Clock3,
      tone: "warning" as const,
    },
    {
      label: "Emitidas",
      value: totalByStatus("Emitida"),
      description: "Operaciones cerradas satisfactoriamente.",
      icon: CheckCircle2,
      tone: "success" as const,
    },
    {
      label: "Canceladas",
      value: totalByStatus("Cancelada"),
      description: "Solicitudes detenidas o descartadas.",
      icon: XCircle,
      tone: "primary" as const,
    },
  ];

  return (
    <div className="page-shell space-y-6 pb-6">
      <PageHeader
        title="Resumen ejecutivo"
        subtitle="Vision consolidada del pipeline interno y de las solicitudes activas."
        icon={TrendingUp}
        actions={
          user?.rol === "operador" ? (
            <Link to="/new">
              <AppButton>
                <Plus className="h-4 w-4" />
                Nueva solicitud
              </AppButton>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(220_16%_86%_/_0.82)] bg-white/75 px-4 py-2 text-sm font-semibold text-[hsl(219_18%_52%)]">
              <span className="h-2 w-2 rounded-full bg-[hsl(152_58%_42%)] animate-pulse-custom" />
              Sistema operativo
            </span>
          )
        }
      />

      {user?.rol === "operador" && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(([type, meta]) => {
            const Icon = meta.icon;

            return (
              <Link key={type} to={`/new?type=${encodeURIComponent(type)}`} className="group">
                <SurfaceCard className="h-full transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]">
                  <div className="relative z-10 flex h-full items-center gap-4">
                    <span className="icon-badge" data-tone={meta.tone}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold tracking-[-0.02em] text-[hsl(222_38%_12%)]">{type}</p>
                      <p className="mt-1 text-sm text-[hsl(219_18%_52%)]">{meta.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[hsl(219_18%_52%)] transition group-hover:translate-x-0.5 group-hover:text-[hsl(350_78%_50%)]" />
                  </div>
                </SurfaceCard>
              </Link>
            );
          })}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            description={metric.description}
            icon={metric.icon}
            tone={metric.tone}
          />
        ))}
      </section>

      <DataTableShell
        title="Solicitudes recientes"
        description="Consulta, filtra y revisa el estado de las operaciones mas recientes."
        actions={
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
            <div className="relative min-w-[260px] flex-1 lg:min-w-[320px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(219_18%_52%)]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por cliente, referencia o ramo"
                className="form-input form-input--with-leading-icon"
              />
            </div>

            <select
              aria-label="Filtrar por estado"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as RequestStatus | "Todos")}
              className="form-select min-w-[180px]"
            >
              <option value="Todos">Todos los estados</option>
              <option value="Borrador">Borrador</option>
              <option value="Enviada">Enviada</option>
              <option value="En gestión">En gestion</option>
              <option value="Respondida">Respondida</option>
              <option value="Emitida">Emitida</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
        }
      >
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-[hsl(219_18%_52%)] sm:px-6">
            Cargando solicitudes...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              icon={Send}
              title="Sin resultados"
              description="No hay solicitudes que coincidan con los filtros actuales."
            />
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="text-left">Cliente</th>
                    <th className="text-left">Ramo</th>
                    <th className="text-left">Referencia</th>
                    <th className="text-left">Estado</th>
                    <th className="text-left">Fecha</th>
                    <th className="text-right">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => {
                    const meta = insuranceTypeMeta[request.ramo];
                    const Icon = meta.icon;

                    return (
                      <tr key={request.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="icon-badge h-11 w-11 rounded-[1rem]" data-tone={meta.tone}>
                              <Icon className="h-4.5 w-4.5" />
                            </span>
                            <div>
                              <p className="font-semibold text-[hsl(222_38%_12%)]">{getClientName(request)}</p>
                              <p className="text-xs text-[hsl(219_18%_52%)]">{request.creador_nombre}</p>
                            </div>
                          </div>
                        </td>
                        <td>{request.ramo}</td>
                        <td className="font-mono text-[0.82rem] text-[hsl(219_18%_52%)]">{request.referencia}</td>
                        <td>
                          <StatusBadge status={request.estado} size="sm" />
                        </td>
                        <td>{format(new Date(request.created_at), "dd MMM yyyy, HH:mm", { locale: es })}</td>
                        <td className="text-right">
                          <Link
                            to={`/request/${request.id}`}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(350_78%_50%)] transition hover:gap-2.5"
                          >
                            Ver detalle
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-5 md:hidden">
              {filteredRequests.map((request) => {
                const meta = insuranceTypeMeta[request.ramo];
                const Icon = meta.icon;

                return (
                  <SurfaceCard key={request.id} className="overflow-hidden">
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-start gap-3">
                        <span className="icon-badge h-11 w-11 rounded-[1rem]" data-tone={meta.tone}>
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[hsl(222_38%_12%)]">{getClientName(request)}</p>
                          <p className="mt-1 text-sm text-[hsl(219_18%_52%)]">{request.ramo}</p>
                        </div>
                        <StatusBadge status={request.estado} size="sm" />
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[hsl(219_18%_52%)]">Referencia</p>
                          <p className="mt-1 font-mono text-[0.82rem] text-[hsl(222_38%_12%)]">{request.referencia}</p>
                        </div>
                        <div>
                          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[hsl(219_18%_52%)]">Fecha</p>
                          <p className="mt-1 text-[hsl(222_38%_12%)]">{format(new Date(request.created_at), "dd MMM yyyy", { locale: es })}</p>
                        </div>
                      </div>

                      <Link
                        to={`/request/${request.id}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(350_78%_50%)]"
                      >
                        Abrir solicitud
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </SurfaceCard>
                );
              })}
            </div>
          </>
        )}

        {!loading && totalPages > 1 && (
          <div className="border-t border-[hsl(220_16%_86%_/_0.7)] px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[hsl(219_18%_52%)]">
                Mostrando{" "}
                <span className="font-semibold text-[hsl(222_38%_12%)]">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{" "}
                a{" "}
                <span className="font-semibold text-[hsl(222_38%_12%)]">
                  {Math.min(currentPage * itemsPerPage, totalItems)}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-[hsl(222_38%_12%)]">{totalItems}</span>
              </p>

              <div className="flex items-center gap-2">
                <AppButton
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                >
                  Anterior
                </AppButton>
                <AppButton
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
                >
                  Siguiente
                </AppButton>
              </div>
            </div>
          </div>
        )}
      </DataTableShell>
    </div>
  );
}
