"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconName =
  | "home"
  | "spool"
  | "box"
  | "printer"
  | "jobs"
  | "tag"
  | "library"
  | "discover"
  | "team"
  | "shield"
  | "api"
  | "data"
  | "system"
  | "audit"
  | "plug";

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true
  };

  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="M3.5 10.5 12 3l8.5 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></>,
    spool: <><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M5.2 6.8h13.6M5.2 17.2h13.6"/></>,
    box: <><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z"/><path d="M12 11v10"/></>,
    printer: <><path d="M7 8V3h10v5"/><rect x="4" y="8" width="16" height="9" rx="2"/><path d="M7 17h10v4H7z"/><path d="M16.5 11h.01"/></>,
    jobs: <><path d="M5 3h14v18H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    tag: <><path d="M20 13 13 20l-9-9V4h7l9 9Z"/><circle cx="8.5" cy="8.5" r="1.2"/></>,
    library: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"/><path d="M9 7h6M9 10h5"/></>,
    discover: <><circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z"/></>,
    team: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    shield: <><path d="M12 3 4.5 6v5.3c0 4.5 3 7.8 7.5 9.7 4.5-1.9 7.5-5.2 7.5-9.7V6L12 3Z"/><path d="m9.5 12 1.7 1.7 3.5-4"/></>,
    api: <><path d="M8 9 4 12l4 3M16 9l4 3-4 3M14 5l-4 14"/></>,
    data: <><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></>,
    system: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
    audit: <><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5M8 17h3"/></>,
    plug: <><path d="M8 12h8"/><path d="M9 8V4M15 8V4"/><path d="M7 8h10v3a5 5 0 0 1-5 5v4"/><path d="M12 20h3"/></>
  };

  return <svg {...common}>{paths[name]}</svg>;
}

const workshop = [
  { href: "/dashboard", label: "Vue d’ensemble", icon: "home" as IconName },
  { href: "/inventory", label: "Bobines", icon: "spool" as IconName },
  { href: "/locations", label: "Emplacements", icon: "box" as IconName },
  { href: "/printers", label: "Imprimantes", icon: "printer" as IconName },
  { href: "/jobs", label: "Impressions", icon: "jobs" as IconName },
  { href: "/labels", label: "Étiquettes", icon: "tag" as IconName }
];

const creator = [
  { href: "/library", label: "Bibliothèque", icon: "library" as IconName },
  { href: "/discover", label: "Discover", icon: "discover" as IconName }
];

const account = [
  { href: "/integrations", label: "Intégrations", icon: "plug" as IconName },
  { href: "/team", label: "Équipe", icon: "team" as IconName },
  { href: "/settings/security", label: "Sécurité", icon: "shield" as IconName },
  { href: "/settings/api", label: "API", icon: "api" as IconName },
  { href: "/settings/data", label: "Données", icon: "data" as IconName },
  { href: "/settings/audit", label: "Journal d’audit", icon: "audit" as IconName }
];

function active(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({
  href,
  label,
  icon,
  mobile = false
}: {
  href: string;
  label: string;
  icon: IconName;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      className={active(pathname, href) ? "nav-link active" : "nav-link"}
      aria-current={active(pathname, href) ? "page" : undefined}
      data-mobile={mobile ? "true" : undefined}
    >
      <span className="nav-icon"><Icon name={icon} /></span>
      <span>{label}</span>
    </Link>
  );
}

export function DesktopNavigation({ instanceAdmin }: { instanceAdmin: boolean }) {
  return (
    <nav className="nav" aria-label="Navigation principale">
      <div className="nav-label">Atelier</div>
      {workshop.map((item) => <NavLink key={item.href} {...item} />)}
      <div className="nav-label">Modèles</div>
      {creator.map((item) => <NavLink key={item.href} {...item} />)}
      <div className="nav-label">Configuration</div>
      {account.map((item) => <NavLink key={item.href} {...item} />)}
      {instanceAdmin && <NavLink href="/settings/system" label="Système" icon="system" />}
    </nav>
  );
}

export function MobileBottomNavigation() {
  const items = [workshop[0], workshop[1], workshop[3], workshop[4], creator[0]];
  return (
    <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
      {items.map((item) => <NavLink key={item.href} {...item} mobile />)}
    </nav>
  );
}

export function MobileMenuLinks({ instanceAdmin }: { instanceAdmin: boolean }) {
  return (
    <div className="mobile-menu-links">
      {workshop.filter((item) => !["/dashboard","/inventory","/printers","/jobs"].includes(item.href)).map((item) => <NavLink key={item.href} {...item} />)}
      {creator.slice(1).map((item) => <NavLink key={item.href} {...item} />)}
      {account.map((item) => <NavLink key={item.href} {...item} />)}
      {instanceAdmin && <NavLink href="/settings/system" label="Système" icon="system" />}
    </div>
  );
}
