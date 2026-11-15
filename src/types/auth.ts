/**
 * Authentication & Role-Based Access Control (RBAC) Types & User Registry
 */

export type UserRole = 'SMT' | 'INBOUND_LOGISTICS';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  department: string;
}

export interface AccountDirectoryEntry {
  username: string;
  defaultPassword: string;
  user: User;
}

const REGISTERED_USERS_KEY = 'dkt_ethiopia_prod_accounts_v1';

export const ACCOUNT_DIRECTORY: AccountDirectoryEntry[] = [];

export function loadRegisteredAccounts(): AccountDirectoryEntry[] {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadAllAccounts(): AccountDirectoryEntry[] {
  const registered = loadRegisteredAccounts();
  return [...ACCOUNT_DIRECTORY, ...registered];
}

export function registerNewAccount(params: {
  fullName: string;
  username: string;
  email: string;
  department: string;
  role: UserRole;
  password: string;
}): { ok: true; user: User } | { ok: false; error: string } {
  const cleanUsername = params.username.trim().toLowerCase();
  const cleanName = params.fullName.trim();
  const cleanEmail = params.email.trim();

  if (!cleanName) {
    return { ok: false, error: 'Please enter your full name.' };
  }
  if (!cleanUsername || cleanUsername.length < 3) {
    return { ok: false, error: 'Username must be at least 3 characters.' };
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { ok: false, error: 'Please enter a valid work email address.' };
  }
  if (!params.password || params.password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters long.' };
  }

  const all = loadAllAccounts();
  if (all.some(entry => entry.username.toLowerCase() === cleanUsername)) {
    return {
      ok: false,
      error: `Username "${cleanUsername}" is already registered. Please sign in or choose another username.`
    };
  }

  const newUser: User = {
    id: `usr-${Date.now()}`,
    username: cleanUsername,
    name: cleanName,
    email: cleanEmail,
    role: params.role,
    title:
      params.role === 'SMT'
        ? 'Senior Management Team (SMT)'
        : 'Inbound Logistics Officer',
    department:
      params.department.trim() ||
      (params.role === 'SMT' ? 'Executive Leadership' : 'Supply Chain & Procurement')
  };

  const existingCustom = loadRegisteredAccounts();
  const updated = [
    ...existingCustom,
    {
      username: cleanUsername,
      defaultPassword: params.password,
      user: newUser
    }
  ];

  try {
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updated));
  } catch {
    // Continue even if storage quota is constrained
  }

  return { ok: true, user: newUser };
}

export const ROLE_PERMISSIONS: Record<
  UserRole,
  {
    label: string;
    shortLabel: string;
    canView: boolean;
    canEdit: boolean;
    canCreate: boolean;
    canDelete: boolean;
    canImport: boolean;
    canExport: boolean;
    summary: string;
  }
> = {
  SMT: {
    label: 'SMT (Senior Management Team)',
    shortLabel: 'SMT · Read & View Only',
    canView: true,
    canEdit: false,
    canCreate: false,
    canDelete: false,
    canImport: false,
    canExport: false,
    summary:
      'Read-only executive dashboard showing real-time inbound order tracking from production to DKT Central Warehouse.'
  },
  INBOUND_LOGISTICS: {
    label: 'Inbound Logistics Team',
    shortLabel: 'Inbound Logistics · Full Access',
    canView: true,
    canEdit: true,
    canCreate: true,
    canDelete: true,
    canImport: true,
    canExport: true,
    summary:
      'Full operational access to create orders, edit shipment milestones, delete records, and import/export Excel & CSV.'
  }
};
