import { UserProfile, UserStats, PlanType } from '../types';

export interface PrivacySafeEvent {
  id?: string;
  userId?: string;
  eventType: string;
  appVersion: string;
  operatingSystem: string;
  encoderType?: string;
  outputFormat?: string;
  success: boolean;
  durationRange?: string; // '<10s', '10-60s', '1-5m', '>5m'
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  adminUserId: string;
  action: string;
  targetUserId?: string;
  details?: string;
  createdAt: string;
}

const EVENTS_KEY = 'vimora_privacy_events';
const AUDIT_LOGS_KEY = 'vimora_admin_audit_logs';

export async function recordPrivacyEvent(event: Omit<PrivacySafeEvent, 'createdAt'>): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const fullEvent: PrivacySafeEvent = {
      ...event,
      createdAt: new Date().toISOString(),
    };
    const raw = localStorage.getItem(EVENTS_KEY);
    const list: PrivacySafeEvent[] = raw ? JSON.parse(raw) : [];
    list.unshift(fullEvent);
    if (list.length > 500) list.length = 500;
    localStorage.setItem(EVENTS_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed recording privacy event:', err);
  }
}

export async function getPrivacyEvents(): Promise<PrivacySafeEvent[]> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function recordAdminAuditLog(
  adminUserId: string,
  action: string,
  targetUserId?: string,
  details?: string
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const log: AdminAuditLog = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      adminUserId,
      action,
      targetUserId,
      details,
      createdAt: new Date().toISOString(),
    };
    const raw = localStorage.getItem(AUDIT_LOGS_KEY);
    const logs: AdminAuditLog[] = raw ? JSON.parse(raw) : [];
    logs.unshift(log);
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed recording audit log:', err);
  }
}

export async function getAdminAuditLogs(): Promise<AdminAuditLog[]> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function exportStatsAsCsv(records: PrivacySafeEvent[]): string {
  const headers = ['eventType', 'appVersion', 'operatingSystem', 'encoderType', 'outputFormat', 'success', 'durationRange', 'createdAt'];
  const rows = records.map((r) => [
    r.eventType,
    r.appVersion,
    r.operatingSystem,
    r.encoderType || 'none',
    r.outputFormat || 'none',
    r.success ? 'true' : 'false',
    r.durationRange || 'n/a',
    r.createdAt,
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
  return csvContent;
}