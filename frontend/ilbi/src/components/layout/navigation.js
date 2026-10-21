import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Receipt,
  CreditCard,
  Building2,
  Coins,
  ShieldCheck,
  Store,
  Users,
  User,
  BookOpen,
  Headphones,
  Sliders,
  History,
  Download,
} from 'lucide-react';


export function getNavigation({ user, isOwner, isAdmin }) {
  const userPerms = user?.permissions || [];
  const canAccessDashboard =
    !user ||
    isAdmin ||
    isOwner ||
    userPerms.includes('*') ||
    userPerms.includes('analytics.view_dashboard');

  // Role-based Nav Items (Clean, readable, no overlapping static badges)
  return [
    ...(canAccessDashboard
      ? [
          {
            to: '/dashboard',
            label: isAdmin ? 'Boshqaruv paneli' : 'Dashboard',
            icon: LayoutDashboard,
          },
        ]
      : []),
    ...(isAdmin
      ? [
          { to: '/accounts', label: 'Hisoblar & Kirish', icon: Users },
          {
            to: '/tenants',
            label: 'Do‘konlar',
            icon: Store,
          },
          {
            to: '/seller-profiles/review',
            label: 'Sotuvchi Tekshiruvi',
            icon: ShieldCheck,
          },
        ]
      : []),
    ...(!isAdmin
      ? [
          {
            to: '/pos',
            label: 'Kassa (POS)',
            icon: ShoppingCart,
          },
          {
            to: '/catalog',
            label: 'Katalog & Tovar',
            icon: Package,
          },
          {
            to: '/inventory',
            label: 'Ombor & Qoldiq',
            icon: Boxes,
          },
          {
            to: '/sales',
            label: 'Savdolar Tarixi',
            icon: Receipt,
          },
          {
            to: '/debts',
            label: 'Mijoz Nasiyalari',
            icon: CreditCard,
          },
          {
            to: '/b2b',
            label: 'B2B Tranzaksiyalar',
            icon: Building2,
          },
          {
            to: '/shifts',
            label: 'Kassa & Smena',
            icon: Coins,
          },
        ]
      : []),
    ...(isAdmin || isOwner
      ? [
          { to: '/history', label: 'Tarix', icon: History },
          ...(isOwner ? [{ to: '/my-tenants', label: 'Mening do‘konlarim', icon: Store }] : []),
          {
            to: '/employees',
            label: 'Xodimlar (Jamoa)',
            icon: Users,
          },
          {
            to: '/audit',
            label: 'Audit Jurnali',
            icon: ShieldCheck,
          },
        ]
      : []),
    ...(isAdmin || isOwner || userPerms.includes('tenants.manage_settings')
      ? [{ to: '/services', label: 'Xizmatlar & Sozlamalar', icon: Sliders }] : []),
    {
      to: '/support',
      label: isAdmin ? 'Yordam: Murojaatlar' : 'Yordam markazi',
      icon: Headphones,
      isSupportWidget: !isAdmin,
    },
    {
      to: '/docs',
      label: 'Qo‘llanma & Hujjatlar',
      icon: BookOpen,
    },
    {
      to: '/download',
      label: 'Yuklab olish',
      icon: Download,
    },
    {
      to: '/profile',
      label: 'Mening Profilim',
      icon: User,
    },
  ];

}
