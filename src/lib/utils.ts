export function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '--:--'
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatHours(hours: string | number | null | undefined): string {
  if (hours === null || hours === undefined) return '-'
  const h = Number(hours)
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return `${hrs}h ${mins}m`
}

export function getStatusBadge(status: string): { class: string; label: string } {
  const map: Record<string, { class: string; label: string }> = {
    full_day: { class: 'badge-green', label: 'Full Day' },
    half_day: { class: 'badge-yellow', label: 'Half Day' },
    overtime: { class: 'badge-purple', label: 'Overtime' },
    absent: { class: 'badge-red', label: 'Absent' },
    holiday: { class: 'badge-blue', label: 'Holiday' },
    weekend: { class: 'badge-gray', label: 'Weekend' },
  }
  return map[status] || { class: 'badge-gray', label: status }
}

export function getLeaveStatusBadge(status: string): { class: string; label: string } {
  const map: Record<string, { class: string; label: string }> = {
    pending: { class: 'badge-yellow', label: 'Pending' },
    approved: { class: 'badge-green', label: 'Approved' },
    rejected: { class: 'badge-red', label: 'Rejected' },
  }
  return map[status] || { class: 'badge-gray', label: status }
}

export function getLeaveTypeBadge(type: string): { class: string; label: string } {
  const map: Record<string, { class: string; label: string }> = {
    sick: { class: 'badge-red', label: 'Sick Leave' },
    casual: { class: 'badge-blue', label: 'Casual Leave' },
    earned: { class: 'badge-green', label: 'Earned Leave' },
    wfh: { class: 'badge-purple', label: 'Work From Home' },
  }
  return map[type] || { class: 'badge-gray', label: type }
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay()
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
