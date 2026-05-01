/// <reference types="vite/client" />
const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';

  export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json() as Promise<T>;
  }

  export interface BotStatus {
    signature: string;
    connected: boolean;
    hasQR: boolean;
    hasPairingCode: boolean;
    ready: boolean;
    lastUpdate: number;
  }

  export interface BotStats {
    totalUsers?: number;
    totalGroups?: number;
    commandsToday?: number;
    uptime?: number;
    messagesHandled?: number;
  }

  export interface BotConfig {
    prefix: string;
    botName: string;
    ownerNumber: string;
    commandCooldown: number;
    level?: Record<string, unknown>;
    economy?: Record<string, unknown>;
    antiSpam?: Record<string, unknown>;
  }

  export interface User {
    jid: string;
    level?: number;
    xp?: number;
    coins?: number;
    name?: string;
  }

  export interface Group {
    id: string;
    subject?: string;
    participants?: number;
    welcome?: boolean;
    antiLink?: boolean;
    antiBad?: boolean;
  }

  export interface ModEntry {
    action: string;
    groupJid: string;
    userJid: string;
    ts: number;
  }

  export interface ActivityEvent {
    id: string | number;
    type: string;
    data: Record<string, unknown>;
    ts: number;
  }

  export interface MaintenanceState {
    enabled: boolean;
    message: string;
  }

  export const getStatus = () => apiFetch<BotStatus>('/status');
  export const getStats = () => apiFetch<BotStats>('/api/stats');
  export const getConfig = () => apiFetch<BotConfig>('/api/config');
  export const postConfig = (body: Partial<BotConfig>) => apiFetch<{ ok: boolean }>('/api/config', { method: 'POST', body: JSON.stringify(body) });
  export const getUsers = () => apiFetch<User[]>('/api/users');
  export const getGroups = () => apiFetch<Group[]>('/api/groups');
  export const getModHistory = () => apiFetch<ModEntry[]>('/api/mod/history');
  export const getActivityHistory = () => apiFetch<ActivityEvent[]>('/api/events/history');
  export const getMaintenance = () => apiFetch<MaintenanceState>('/api/maintenance');
  export const postMaintenance = (body: Partial<MaintenanceState>) => apiFetch<{ ok: boolean }>('/api/maintenance', { method: 'POST', body: JSON.stringify(body) });
  export const postReset = () => apiFetch<{ ok: boolean }>('/reset', { method: 'POST' });
  export const postPairingCode = (phone: string) => apiFetch<{ code?: string; error?: string }>('/pairing-code', { method: 'POST', body: JSON.stringify({ phone }) });
  export const postBroadcast = (message: string, groups: string[]) => apiFetch<{ ok: boolean }>('/api/broadcast', { method: 'POST', body: JSON.stringify({ message, groups }) });
  export const postModAction = (body: unknown) => apiFetch<{ ok: boolean }>('/api/mod/action', { method: 'POST', body: JSON.stringify(body) });

  export const getApiUrl = () => API_URL;
  