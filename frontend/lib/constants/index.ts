export interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles?: readonly string[];
}

export const CIL_SUBSIDIARIES = [
  { value: 'ALL', label: 'All Subsidiaries' },
  { value: 'ECL', label: 'Eastern Coalfields Limited (ECL)' },
  { value: 'BCCL', label: 'Bharat Coking Coal Limited (BCCL)' },
  { value: 'CCL', label: 'Central Coalfields Limited (CCL)' },
  { value: 'WCL', label: 'Western Coalfields Limited (WCL)' },
  { value: 'SECL', label: 'South Eastern Coalfields Limited (SECL)' },
  { value: 'NCL', label: 'Northern Coalfields Limited (NCL)' },
  { value: 'MCL', label: 'Mahanadi Coalfields Limited (MCL)' },
  { value: 'CMPDI', label: 'Central Mine Planning & Design Institute (CMPDI)' },
  { value: 'CIL HQ', label: 'Coal India Limited HQ (CIL HQ)' },
] as const;

export const FISCAL_YEARS = [
  { value: '2023-24', label: 'FY 2023-24' },
  { value: '2022-23', label: 'FY 2022-23' },
  { value: '2021-22', label: 'FY 2021-22' },
] as const;

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Executive Dashboard', icon: 'LayoutDashboard' },
  { href: '/documents', label: 'Document Library', icon: 'FileText' },
  { href: '/query', label: 'Ask COALINTEL', icon: 'Sparkles' },
  { href: '/comparison', label: 'Metric Comparison', icon: 'GitCompare' },
  { href: '/analytics', label: 'Analytics & Cloud', icon: 'BarChart3' },
  { href: '/validation', label: 'Validation Feed', icon: 'ShieldCheck' },
  { href: '/conflicts', label: 'Conflict Resolver', icon: 'GitCompare', roles: ['Admin', 'Reviewer'] },
  { href: '/reports', label: 'Report Wizard', icon: 'FileSpreadsheet' },
  { href: '/audit', label: 'Audit Logs', icon: 'History', roles: ['Admin'] },
];
