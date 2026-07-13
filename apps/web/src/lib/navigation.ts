import { permissions, type Permission } from "@fleetcontrol/authz";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  Factory,
  Gauge,
  Network,
  Settings,
  ShieldCheck,
  Truck,
  UserCircle,
  Users,
  ContactRound,
  ScrollText,
  Fuel,
  Wrench,
} from "lucide-react";

export const navigationItems: Array<{
  label: string;
  href: string;
  icon: typeof Gauge;
  permission?: Permission;
}> = [
  { label: "Dashboard", href: "/dashboard", icon: Gauge },
  {
    label: "Frota",
    href: "/dashboard/frota",
    icon: Truck,
    permission: permissions.fleet.read,
  },
  {
    label: "Motoristas",
    href: "/dashboard/motoristas",
    icon: ContactRound,
    permission: permissions.drivers.read,
  },
  {
    label: "Contratos",
    href: "/dashboard/contratos",
    icon: ScrollText,
    permission: permissions.contracts.read,
  },
  {
    label: "Abastecimentos",
    href: "/dashboard/abastecimentos",
    icon: Fuel,
    permission: permissions.fuel.read,
  },
  {
    label: "Manutencao",
    href: "/dashboard/manutencao",
    icon: Wrench,
    permission: permissions.maintenance.read,
  },
  {
    label: "Empresa",
    href: "/dashboard/empresa",
    icon: Building2,
    permission: permissions.company.read,
  },
  {
    label: "Filiais",
    href: "/dashboard/filiais",
    icon: Factory,
    permission: permissions.branches.read,
  },
  {
    label: "Departamentos",
    href: "/dashboard/departamentos",
    icon: Network,
    permission: permissions.departments.read,
  },
  {
    label: "Usuários",
    href: "/dashboard/usuarios",
    icon: Users,
    permission: permissions.users.read,
  },
  {
    label: "Equipes",
    href: "/dashboard/equipes",
    icon: Users,
    permission: permissions.departments.read,
  },
  {
    label: "Cargos",
    href: "/dashboard/cargos",
    icon: BriefcaseBusiness,
    permission: permissions.departments.read,
  },
  {
    label: "Permissões",
    href: "/dashboard/permissoes",
    icon: ShieldCheck,
    permission: permissions.roles.read,
  },
  {
    label: "Notificações",
    href: "/dashboard/notificacoes",
    icon: Bell,
    permission: permissions.notifications.read,
  },
  { label: "Perfil", href: "/dashboard/perfil", icon: UserCircle },
  {
    label: "Configurações",
    href: "/dashboard/configuracoes",
    icon: Settings,
    permission: permissions.settings.read,
  },
];
