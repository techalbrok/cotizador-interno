import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Plus, Search, Send } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { InsuranceType, RequestStatus } from "../types";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import { insuranceTypeMeta } from "../lib/ui";
import AppButton from "../components/ui/AppButton";
import DataTableShell from "../components/ui/DataTableShell";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import StatusBadge from "../components/ui/StatusBadge";
import SurfaceCard from "../components/ui/SurfaceCard";

type AvisadorRequest = {
  id: number;
  referencia: string;
  ramo: InsuranceType;
  estado: RequestStatus;
  created_at: string;
  creador_nombre: string;
  datos_formulario?: Record<string, unknown>;
};

const getClientName = (request: AvisadorRequest) => (
  String(request.datos_formulario?.nombre_cliente || request.creador_nombre || "Cliente")
);

export default function AvisadorDashboard() {
  const { user, token } = useAuth();
  const [requests, setRequests] = useState<AvisadorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    apiFetch("/api/solicitudes?limit=100", token)
      .then((res) => res.json())
      .then((data) => {
        setRequests(data.data || []);
      })
      .catch((error) => {
        console.error("Error fetching avisos:", error);
      })
      .finally(() => setLoading(false));
  }, [token]);

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

  return (
    <div className="page-shell space-y-4 pb-4">
      <PageHeader
        title="Mis avisos"
        subtitle="Aqui veras los avisos que has pasado a tu delegacion para que los tramiten."
        icon={FileText}
        actions={
          <Link to="/new">
            <AppButton size="sm">
              <Plus className="h-3.5 w-3.5" />
              Nuevo aviso
            </AppButton>
          </Link>
        }
      />

      <section className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map(([type, meta]) => {
          const Icon = meta.icon;
          return (
            <Link key={type} to={`/new?type=${encodeURIComponent(type)}`} className="group">
              <SurfaceCard className="h-full transition hover:border-[hsl(220_14%_78%)] hover:shadow-[var(--shadow-glow)]">
                <div className="relative z-10 flex h-full items-center gap-2.5">
                  <span className="icon-badge" data-tone={meta.tone}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.88rem] font-semibold tracking-[-0.01em] text-[hsl(222_38%_12%)] leading-tight">{type}</p>
                    <p className="mt-0.5 text-[0.75rem] text-[hsl(219_14%_46%)] truncate">{meta.description}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[hsl(219_14%_46%)] transition group-hover:translate-x-0.5 group-hover:text-[hsl(350_78%_50%)]" />
                </div>
              </SurfaceCard>
            </Link>
          );
        })}
      </section>

      <DataTableShell
        title="Mis avisos"
        description="Listado de avisos que has creado. Tu delegacion se encarga de tramitarlos."
        actions={
          <div className="relative min-w-[220px] flex-1 lg:min-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[hsl(219_14%_46%)]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por cliente o referencia"
              className="form-input form-input--with-leading-icon"
            />
          </div>
        }
      >
        {loading ? (
          <div className="px-4 py-8 text-center text-[0.85rem] text-[hsl(219_14%_46%)]">
            Cargando avisos...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Send}
              title="Aun no has pasado ningun aviso"
              description="Cuando generes un aviso aparecera en esta lista para que puedas consultar su estado."
            />
          </div>
        ) : (
          <div className="grid gap-2.5 p-3 md:hidden">
            {filteredRequests.map((request) => {
              const meta = insuranceTypeMeta[request.ramo];
              const Icon = meta.icon;
              return (
                <SurfaceCard key={request.id} className="overflow-hidden">
                  <div className="relative z-10 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="icon-badge" data-tone={meta.tone}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[hsl(222_38%_12%)] truncate">{getClientName(request)}</p>
                        <p className="text-[0.78rem] text-[hsl(219_14%_46%)]">{request.ramo}</p>
                      </div>
                      <StatusBadge status={request.estado} size="sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[0.78rem]">
                      <div>
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.04em] text-[hsl(219_14%_46%)]">Referencia</p>
                        <p className="mt-0.5 font-mono text-[0.78rem] text-[hsl(222_38%_12%)]">{request.referencia}</p>
                      </div>
                      <div>
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.04em] text-[hsl(219_14%_46%)]">Fecha</p>
                        <p className="mt-0.5 text-[hsl(222_38%_12%)]">{format(new Date(request.created_at), "dd MMM yyyy", { locale: es })}</p>
                      </div>
                    </div>
                    <Link
                      to={`/request/${request.id}`}
                      className="inline-flex items-center gap-1 text-[0.82rem] font-medium text-[hsl(350_78%_50%)]"
                    >
                      Ver detalle
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </SurfaceCard>
              );
            })}
          </div>
        )}
      </DataTableShell>
    </div>
  );
}
