import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronsLeft,
  ChevronsRight,
  FilePlus,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  User as UserIcon,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "../context/AuthContext";

type NavItem = {
  name: string;
  path: string;
  icon: typeof LayoutDashboard;
};

const ROLE_LABEL: Record<string, string> = {
  operador: "Operador",
  gestor: "Gestor",
  admin: "Administrador",
  superadmin: "Super admin",
  avisador: "Avisador",
  tramitador_central: "Tramitador central",
};

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  const isAvisador = user?.rol === "avisador";
  const isOperador = user?.rol === "operador";
  const isPrivileged = user?.rol === "admin" || user?.rol === "superadmin";

  const navItems: NavItem[] = useMemo(() => {
    if (isAvisador) {
      return [
        { name: "Mis avisos", path: "/avisador", icon: Inbox },
        { name: "Nuevo aviso", path: "/new", icon: FilePlus },
      ];
    }
    return [
      { name: "Resumen", path: "/", icon: LayoutDashboard },
      ...(isOperador ? [{ name: "Nueva solicitud", path: "/new", icon: FilePlus }] : []),
      ...(isPrivileged ? [{ name: "Configuracion", path: "/settings", icon: Settings }] : []),
    ];
  }, [user?.rol, isAvisador, isOperador, isPrivileged]);

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    await logout();
    navigate("/login");
  };

  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!accountMenuRef.current) return;
      if (!accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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

  const renderSidebar = (isCollapsed: boolean) => (
    <aside
      className={clsx(
        "flex h-full flex-col rounded-xl border border-white/[0.06] bg-[hsl(222_42%_8%)] text-white shadow-[0_18px_44px_-24px_rgb(8_13,26_/_0.55)] transition-all duration-200",
      )}
    >
      <div
        className={clsx(
          "flex items-center gap-2.5 border-b border-white/[0.06] px-3 py-3",
          isCollapsed ? "justify-center" : "justify-between",
        )}
      >
        {!isCollapsed && (
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="inline-flex items-center gap-2 min-w-0"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[hsl(350_78%_50%)] text-[0.7rem] font-bold text-white shadow-[0_4px_10px_-2px_hsl(350_78%_50%_/_0.45)]">
              A
            </span>
            <span className="flex flex-col min-w-0">
              <span className="text-[0.78rem] font-semibold tracking-[-0.01em] text-white leading-none">
                Albroksa
              </span>
              <span className="mt-0.5 text-[0.65rem] font-medium uppercase tracking-[0.08em] text-white/45">
                Cotizador
              </span>
            </span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/55 transition hover:bg-white/[0.06] hover:text-white lg:inline-flex"
        >
          {isCollapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          aria-label="Cerrar menu"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/55 transition hover:bg-white/[0.06] hover:text-white lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-2 pt-2">
        <p
          className={clsx(
            "px-2.5 pb-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-white/35",
            isCollapsed && "sr-only",
          )}
        >
          Navegacion
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={clsx(
                    "group relative flex items-center rounded-md py-1.5 text-[0.82rem] font-medium transition-colors",
                    isCollapsed ? "justify-center px-0" : "gap-2.5 pl-2.5 pr-2",
                    isActive
                      ? "bg-white/[0.06] text-white"
                      : "text-white/65 hover:bg-white/[0.04] hover:text-white",
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-[hsl(350_78%_50%)] shadow-[0_0_8px_hsl(350_78%_50%_/_0.6)]"
                    />
                  )}
                  <item.icon
                    className={clsx(
                      "h-[1.05rem] w-[1.05rem] shrink-0 transition-colors",
                      isActive ? "text-[hsl(350_88%_72%)]" : "text-current",
                    )}
                  />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/[0.06] px-2 py-2">
        {isCollapsed ? (
          <div className="flex justify-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[hsl(226_46%_40%)] to-[hsl(232_46%_52%)] text-[0.7rem] font-semibold text-white">
              {userInitials}
            </div>
          </div>
        ) : (
          <div className="rounded-md bg-white/[0.04] px-2.5 py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[hsl(226_46%_40%)] to-[hsl(232_46%_52%)] text-[0.7rem] font-semibold text-white">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.78rem] font-semibold leading-none text-white">
                  {user?.nombre || "Usuario"}
                </p>
                <p className="mt-1 truncate text-[0.65rem] font-medium uppercase tracking-[0.05em] text-white/45">
                  {ROLE_LABEL[user?.rol || ""] || user?.rol}
                </p>
              </div>
            </div>
          </div>
        )}
        <p
          className={clsx(
            "mt-2 text-center text-[0.6rem] leading-4 text-white/30",
            isCollapsed && "sr-only",
          )}
        >
          v1 2026 Albroksa
        </p>
      </div>
    </aside>
  );

  return (
    <div className="h-screen overflow-hidden bg-[hsl(220_22%_97%)] p-[3px]">
      <div className="flex h-full overflow-hidden gap-[3px]">
        <div
          className={clsx(
            "hidden h-full shrink-0 transition-all duration-200 lg:block",
            sidebarCollapsed ? "w-[60px]" : "w-[232px]",
          )}
        >
          {renderSidebar(sidebarCollapsed)}
        </div>

        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-[hsl(222_38%_12%_/_0.45)] backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed inset-y-[3px] left-[3px] z-50 w-[min(90vw,232px)] lg:hidden">
              {renderSidebar(false)}
            </div>
          </>
        )}

        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-[3px]">
          <header className="flex h-12 items-center justify-between gap-3 rounded-xl border border-[hsl(220_14%_88%_/_0.85)] bg-white px-3 shadow-[0_1px_2px_hsl(222_38%_12%_/_0.04)]">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                aria-label="Abrir menu"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[hsl(220_14%_88%_/_0.85)] bg-white text-[hsl(222_38%_12%)] transition hover:bg-[hsl(220_22%_97%)] lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="hidden sm:flex sm:items-center sm:gap-2 min-w-0">
                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[hsl(219_14%_46%)]">
                  Workspace
                </span>
                <span className="text-[hsl(220_14%_88%)]">/</span>
                <span className="truncate text-[0.82rem] font-semibold text-[hsl(222_38%_12%)]">
                  {navItems.find((item) =>
                    location.pathname === item.path ||
                    (item.path !== "/" && location.pathname.startsWith(item.path)),
                  )?.name || "Albroksa"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative" ref={accountMenuRef}>
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((value) => !value)}
                  className="inline-flex items-center gap-2 rounded-md border border-[hsl(220_14%_88%_/_0.85)] bg-white py-1 pl-1 pr-2 transition hover:bg-[hsl(220_22%_97%)]"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[hsl(226_46%_40%)] to-[hsl(232_46%_52%)] text-[0.7rem] font-semibold text-white">
                    {userInitials}
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-[0.78rem] font-semibold leading-none text-[hsl(222_38%_12%)]">
                      {user?.nombre || "Usuario"}
                    </p>
                    <p className="mt-1 text-[0.65rem] font-medium uppercase tracking-[0.05em] text-[hsl(219_14%_46%)]">
                      {ROLE_LABEL[user?.rol || ""] || user?.rol}
                    </p>
                  </div>
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.4rem)] z-[80] w-[260px] overflow-hidden rounded-lg border border-[hsl(220_14%_88%_/_0.85)] bg-white shadow-[0_18px_36px_-18px_rgba(10,16,34,0.32)]">
                    <div className="flex items-center gap-2.5 border-b border-[hsl(220_14%_88%_/_0.7)] px-3 py-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[hsl(226_46%_40%)] to-[hsl(232_46%_52%)] text-[0.78rem] font-semibold text-white">
                        {userInitials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[0.85rem] font-semibold text-[hsl(222_38%_12%)]">
                          {user?.nombre || "Usuario"}
                        </p>
                        <p className="truncate text-[0.72rem] text-[hsl(219_14%_46%)]">
                          {user?.email}
                        </p>
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/settings"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-[0.82rem] font-medium text-[hsl(222_38%_12%)] transition hover:bg-[hsl(220_22%_97%)]"
                      >
                        <UserIcon className="h-3.5 w-3.5 text-[hsl(219_14%_46%)]" />
                        Mi perfil
                      </Link>

                      {!isAvisador && (
                        <Link
                          to="/settings"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-1.5 text-[0.82rem] font-medium text-[hsl(222_38%_12%)] transition hover:bg-[hsl(220_22%_97%)]"
                        >
                          <Settings className="h-3.5 w-3.5 text-[hsl(219_14%_46%)]" />
                          Configuracion
                        </Link>
                      )}
                    </div>

                    <div className="h-px bg-[hsl(220_14%_88%_/_0.7)]" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3 py-2 text-[0.82rem] font-medium text-[hsl(353_72%_44%)] transition hover:bg-[hsl(353_78%_52%_/_0.08)]"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Cerrar sesion
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <section className="min-h-0 flex-1 overflow-hidden">
            <div className="h-full overflow-auto">
              <Outlet />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
