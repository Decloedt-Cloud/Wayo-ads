// Role utilities for handling comma-separated roles

export type UserRole = 'USER' | 'ADVERTISER' | 'CREATOR' | 'SUPERADMIN';

export function parseRoles(rolesString: string): UserRole[] {
  return rolesString.split(',').filter(Boolean) as UserRole[];
}

export function hasRole(rolesString: string, role: UserRole): boolean {
  const roles = parseRoles(rolesString);
  return roles.includes(role);
}

export function hasAnyRole(rolesString: string, checkRoles: UserRole[]): boolean {
  const roles = parseRoles(rolesString);
  return checkRoles.some((role) => roles.includes(role));
}

export function addRole(rolesString: string, role: UserRole): string {
  const roles = parseRoles(rolesString);
  if (!roles.includes(role)) {
    roles.push(role);
  }
  return roles.join(',');
}

export function removeRole(rolesString: string, role: UserRole): string {
  const roles = parseRoles(rolesString);
  return roles.filter((r) => r !== role).join(',');
}

export function formatRoles(roles: UserRole[]): string {
  return roles.join(',');
}

export function isSuperAdmin(rolesString: string): boolean {
  return hasRole(rolesString, 'SUPERADMIN');
}
