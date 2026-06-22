import { PUBLIC_API_URL } from '$env/static/public'
const BASE = PUBLIC_API_URL ?? 'http://localhost:3000/api'

function getToken() {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem('token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/'
    throw new Error('Unauthorized')
  }

  // Defensive parsing — backend might return empty body or non-JSON on unexpected errors
  const text = await res.text()
  let data: any
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(text || 'Server returned an invalid response')
  }
  if (!res.ok) throw new Error(data?.error || 'Request failed')
  return data as T
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; employee: any }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  changePassword: (employeeId: number, oldPassword: string, newPassword: string) =>
    request('/auth/change-password', {
      method: 'POST', body: JSON.stringify({ employeeId, oldPassword, newPassword }),
    }),

  // Attendance
  getTodayAttendance: () => request<any>('/attendance/today'),
  getTodayAll: () => request<any[]>('/attendance/today-all'),
  getOfficeConfig: () => request<{ lat: number; lng: number; radius: number; name: string }>('/attendance/office-config'),
  punchIn: (latitude: number, longitude: number) =>
    request<any>('/attendance/punch-in', { method: 'POST', body: JSON.stringify({ latitude, longitude }) }),
  punchOut: () => request<any>('/attendance/punch-out', { method: 'POST' }),
  getAttendanceHistory: (month?: number, year?: number) => {
    const params = new URLSearchParams()
    if (month) params.set('month', String(month))
    if (year) params.set('year', String(year))
    return request<any[]>(`/attendance/history?${params}`)
  },
  adminMarkAttendance: (data: { employeeId: number; date: string; punchIn?: string; punchOut?: string; status?: string; notes?: string }) =>
    request<any>('/attendance/admin-mark', { method: 'POST', body: JSON.stringify(data) }),
  getAttendanceSummary: (month?: number, year?: number) => {
    const params = new URLSearchParams()
    if (month) params.set('month', String(month))
    if (year) params.set('year', String(year))
    return request<any>(`/attendance/summary?${params}`)
  },
  getEmployeeAttendance: (id: number, month?: number, year?: number) => {
    const params = new URLSearchParams()
    if (month) params.set('month', String(month))
    if (year) params.set('year', String(year))
    return request<any[]>(`/attendance/employee/${id}?${params}`)
  },

  // Leave
  getLeaveBalance: (year?: number) => {
    const params = year ? `?year=${year}` : ''
    return request<any>(`/leave/balance${params}`)
  },
  getMyLeaves: (year?: number) => {
    const params = year ? `?year=${year}` : ''
    return request<any[]>(`/leave/my-leaves${params}`)
  },
  applyLeave: (data: { leaveType: string; startDate: string; endDate: string; reason: string }) =>
    request<any>('/leave/apply', { method: 'POST', body: JSON.stringify(data) }),
  cancelLeave: (id: number) => request(`/leave/${id}`, { method: 'DELETE' }),
  getAllLeaves: () => request<any[]>('/leave/all'),
  getEmployeeLeaveBalance: (id: number, year?: number) => {
    const params = year ? `?year=${year}` : ''
    return request<any>(`/leave/balance/${id}${params}`)
  },
  setEmployeeLeaveBalance: (id: number, data: { sickLeave: number; casualLeave: number; earnedLeave: number; wfhLeave: number; year?: number }) =>
    request<any>(`/leave/balance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  approveLeave: (id: number) => request(`/leave/${id}/approve`, { method: 'PATCH' }),
  rejectLeave: (id: number, reason: string) =>
    request(`/leave/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),

  // Employees
  getEmployees: () => request<any[]>('/employees'),
  getMe: () => request<any>('/employees/me'),
  getEmployee: (id: number) => request<any>(`/employees/${id}`),
  createEmployee: (data: any) =>
    request<any>('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: number, data: any) =>
    request<any>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleEmployee: (id: number) => request(`/employees/${id}/toggle`, { method: 'PATCH' }),
  resetAllData: () => request('/employees/reset-all', { method: 'DELETE' }),

  // Holidays
  getHolidays: (year?: number) => {
    const params = year ? `?year=${year}` : ''
    return request<any[]>(`/holidays${params}`)
  },
  createHoliday: (data: any) =>
    request<any>('/holidays', { method: 'POST', body: JSON.stringify(data) }),
  approveHoliday: (id: number) => request<any>(`/holidays/${id}/approve`, { method: 'PATCH' }),
  revokeHoliday: (id: number) => request<any>(`/holidays/${id}/revoke`, { method: 'PATCH' }),
  deleteHoliday: (id: number) => request(`/holidays/${id}`, { method: 'DELETE' }),
}
