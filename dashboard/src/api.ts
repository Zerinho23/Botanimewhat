/// <reference types="vite/client" />
    function normalizeUrl(raw?: string): string {
      if (!raw) return '';
      const trimmed = raw.trim().replace(/\/$/, '');
      if (!trimmed) return '';
      if (!/^https?:\/\//i.test(trimmed)) return 'https://' + trimmed;
      return trimmed;
    }
    const API_URL = normalizeUrl(import.meta.env.VITE_API_URL);

    export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
      const res = await fetch(`${API_URL}${path}`, {
        ...opts,
        headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
      });
      if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
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
      users: number;
      groups: number;
      connected: boolean;
      uptime: number;
      commandsToday?: number;
      messages?: number;
      eventsToday?: number;
      totalCommands?: number;
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
      name?: string;
      xp: number;
      level: number;
      coins: number;
      messages?: number;
      commands?: number;
      waifus?: unknown[];
      lastDaily?: number;
      createdAt?: number;
    }

    export interface Group {
      jid: string;
      name: string;
      antiLink: boolean;
      antiSpam: boolean;
      welcome: boolean;
      botEnabled: boolean;
      memberCount?: number;
      createdAt?: number | null;
    }

    export interface GroupMember {
      jid: string;
      name?: string;
      isAdmin: boolean;
    }

    export interface GroupModData {
      groupName: string;
      members: GroupMember[];
      muted: string[];
      warnings: Record<string, number>;
    }

    export interface ModEntry {
      action: string;
      groupJid: string;
      userJid: string;
      ts: number;
      userName?: string;
      groupName?: string;
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

    export const getStatus          = () => apiFetch<BotStatus>('/status');
    export const getStats           = () => apiFetch<BotStats>('/api/stats');
    export const getConfig          = () => apiFetch<BotConfig>('/api/config');
    export const postConfig         = (b: Partial<BotConfig>) => apiFetch<{ok:boolean}>('/api/config',{method:'POST',body:JSON.stringify(b)});
    export const getUsers           = () => apiFetch<User[]>('/api/users');
    export const getGroups          = () => apiFetch<Group[]>('/api/groups');
    export const getModHistory      = () => apiFetch<ModEntry[]>('/api/mod/history');
    export const getModGroup        = (jid: string) => apiFetch<GroupModData>(`/api/mod/group/${encodeURIComponent(jid)}`);
    export const getActivityHistory = () => apiFetch<ActivityEvent[]>('/api/events/history');
    export const getMaintenance     = () => apiFetch<MaintenanceState>('/api/maintenance');
    export const postMaintenance    = (b: Partial<MaintenanceState>) => apiFetch<{ok:boolean}>('/api/maintenance',{method:'POST',body:JSON.stringify(b)});
    export const postReset          = () => apiFetch<{ok:boolean}>('/reset',{method:'POST'});
    export const postPairingCode    = (phone: string) => apiFetch<{code?:string;error?:string}>('/pairing-code',{method:'POST',body:JSON.stringify({phone})});
    export const postBroadcast      = (message: string, groups: string[]) => apiFetch<{ok:boolean}>('/api/broadcast',{method:'POST',body:JSON.stringify({message,groups})});
    export const patchGroupEnabled  = (jid: string, enabled: boolean) => apiFetch<{ok:boolean}>(`/api/groups/${encodeURIComponent(jid)}/enabled`,{method:'PATCH',body:JSON.stringify({enabled})});
    export const deleteGroup        = (jid: string) => apiFetch<{ok:boolean}>(`/api/groups/${encodeURIComponent(jid)}`,{method:'DELETE'});
    export const postGroupSettings  = (jid: string, data: Record<string,unknown>) => apiFetch<{ok:boolean}>(`/api/groups/${encodeURIComponent(jid)}`,{method:'POST',body:JSON.stringify(data)});
    export const postModAction      = (b: unknown) => apiFetch<{ok:boolean}>('/api/mod/action',{method:'POST',body:JSON.stringify(b)});
    export const adjustUser         = (jid: string, coins?: number, level?: number) => apiFetch<{ok:boolean;user:User}>(`/api/users/${encodeURIComponent(jid)}/adjust`,{method:'POST',body:JSON.stringify({...(coins!==undefined&&{coins}),...(level!==undefined&&{level})})});
    export const getApiUrl          = () => API_URL;
    export const isConfigured       = () => API_URL.length > 0;
  