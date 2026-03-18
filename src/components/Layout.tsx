import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FilePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  Settings,
  User,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "../context/AuthContext";

type NavItem = {
  name: string;
  path: string;
  icon: typeof LayoutDashboard;
};

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  const navItems: NavItem[] = useMemo(
    () => [
      { name: "Dashboard", path: "/", icon: LayoutDashboard },
      ...(user?.rol === "operador" ? [{ name: "Nueva solicitud", path: "/new", icon: FilePlus }] : []),
      { name: "Configuracion", path: "/settings", icon: Settings },
    ],
    [user?.rol]
  );

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

  const sidebar = (
    <aside className="flex h-full flex-col rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,hsl(229_38%_12%),hsl(222_42%_10%)_48%,hsl(222_42%_9%))] px-3 py-4 text-white shadow-[var(--shadow-sidebar)]">
      <div className="flex items-center justify-between gap-3 px-3 pb-5 pt-2">
        <Link to="/" onClick={() => setMobileMenuOpen(false)} className="inline-flex items-center">
          <img
            src="/logos/logo_albrok_blanco_transp.png"
            alt="Albroksa"
            className="h-auto w-[200px] max-w-full object-contain"
          />
        </Link>
        <button
          type="button"
          className="hidden h-10 w-10 items-center justify-center rounded-2xl text-[hsl(221_20%_72%)] transition hover:bg-white/6 hover:text-white lg:inline-flex"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-[hsl(221_20%_72%)] transition hover:bg-white/6 hover:text-white lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="mt-2 flex-1 space-y-1.5 px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={clsx(
                "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300",
                isActive
                  ? "bg-[linear-gradient(135deg,hsl(350_65%_24%),hsl(350_60%_18%))] text-white shadow-[0_18px_30px_-24px_hsl(350_78%_50%_/_0.95)]"
                  : "text-[hsl(221_20%_72%)] hover:bg-white/6 hover:text-white"
              )}
            >
              <item.icon className={clsx("h-[1.05rem] w-[1.05rem]", isActive ? "text-[hsl(350_88%_72%)]" : "text-current")} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-2 pt-6 text-center text-[0.72rem] leading-6 text-[hsl(221_20%_58%)]">
        <p>Gestion de solicitudes</p>
        <p>v1 2026 Albroksa</p>
        <p>Correduria de Seguros</p>
      </div>
    </aside>
  );

  return (
    <div className="h-screen overflow-hidden p-[3px]">
      <div className="flex h-full overflow-hidden gap-[3px]">
        <div className="hidden h-full w-[300px] shrink-0 lg:block">{sidebar}</div>

        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-[hsl(222_38%_12%_/_0.45)] backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-[3px] left-[3px] z-50 w-[min(90vw,300px)] lg:hidden">{sidebar}</div>
          </>
        )}

        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-[3px]">
          <header className="surface-glass relative z-50 flex min-h-20 items-center justify-between gap-4 overflow-visible rounded-[1.75rem] px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[hsl(220_16%_86%_/_0.8)] bg-white/70 text-[hsl(222_38%_12%)] shadow-[0_14px_28px_-24px_hsl(222_38%_12%_/_0.55)] transition hover:bg-white lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(219_18%_52%)]">Albroksa Workspace</p>
                <p className="mt-1 text-sm text-[hsl(219_18%_52%)]">Canal interno de cotizacion y colaboracion.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative" ref={accountMenuRef}>
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((value) => !value)}
                  className="inline-flex items-center gap-2 rounded-full border border-[hsl(220_16%_86%_/_0.8)] bg-white/75 py-1 pl-1 pr-2.5 transition hover:bg-white"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(219_18%_52%_/_0.12)] text-sm font-bold text-[hsl(222_38%_12%)]">
                    {user?.nombre?.charAt(0).toUpperCase() || "A"}
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-[0.95rem] font-semibold leading-5 text-[hsl(222_38%_12%)]">{user?.nombre || "Usuario"}</p>
                    <p className="text-xs capitalize text-[hsl(219_18%_52%)]">{user?.rol || "operador"}</p>
                  </div>
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.45rem)] z-[80] w-[252px] overflow-hidden rounded-[1.05rem] border border-[hsl(220_16%_86%_/_0.85)] bg-white shadow-[0_20px_40px_-24px_rgba(10,16,34,0.42)]">
                    <div className="px-4 py-3">
                      <p className="text-[1.25rem] font-semibold tracking-[-0.02em] text-[hsl(222_38%_12%)]">{user?.nombre || "Usuario"}</p>
                      <p className="mt-1 truncate text-sm text-[hsl(219_18%_52%)]">{user?.email || ""}</p>
                    </div>

                    <div className="h-px bg-[hsl(220_16%_86%_/_0.8)]" />

                    <Link
                      to="/settings"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-base font-medium text-[hsl(222_38%_12%)] transition hover:bg-[hsl(220_30%_97%)]"
                    >
                      <User className="h-4.5 w-4.5" />
                      Mi perfil
                    </Link>

                    <div className="h-px bg-[hsl(220_16%_86%_/_0.8)]" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-3 text-base font-medium text-[hsl(353_72%_46%)] transition hover:bg-[hsl(353_83%_60%_/_0.08)]"
                    >
                      <LogOut className="h-4.5 w-4.5" />
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
