import { clsx, type ClassValue } from 'clsx'
  import { twMerge } from 'tailwind-merge'

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
  }

  export function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (d > 0) return `${d}d ${h}h ${m}m`
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  export function formatNumber(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
  }

  export function timeAgo(ts: number): string {
    const diff = Date.now() - ts
    const s = Math.floor(diff / 1000)
    if (s < 60) return `hace ${s}s`
    const m = Math.floor(s / 60)
    if (m < 60) return `hace ${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `hace ${h}h`
    return `hace ${Math.floor(h / 24)}d`
  }

  export function rankOf(lv: number) {
    if (lv >= 20) return { l: 'S', color: '#ffd700' }
    if (lv >= 15) return { l: 'A', color: '#b44fff' }
    if (lv >= 10) return { l: 'B', color: '#00c8ff' }
    if (lv >= 5)  return { l: 'C', color: '#00ff88' }
    if (lv >= 2)  return { l: 'D', color: '#aaaaaa' }
    return { l: 'E', color: '#555577' }
  }

  export function shortJid(jid: string): string {
    return (jid || '').replace('@s.whatsapp.net', '').replace('@g.us', '')
  }
  