<script lang="ts">
  import { onMount } from 'svelte'
  import { X, ChevronLeft, ChevronRight, Calendar, Umbrella, Clock, TrendingUp, UserCheck, UserX } from 'lucide-svelte'
  import { api } from '$lib/api'
  import { formatDate, formatTime, formatHours, MONTHS, getDaysInMonth, getFirstDayOfMonth, getLeaveTypeBadge, getLeaveStatusBadge } from '$lib/utils'

  export let employee: any
  export let allLeaves: any[] = []
  export let holidays: any[] = []
  export let onClose: () => void = () => {}

  let activeTab: 'attendance' | 'leaves' = 'attendance'
  let currentMonth = new Date().getMonth() + 1
  let currentYear = new Date().getFullYear()

  let attendanceHistory: any[] = []
  let leaveBalance: any = null
  let loadingAtt = false
  let loadingBal = false

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  $: attendanceMap = Object.fromEntries(attendanceHistory.map(r => [r.date, r.status]))
  $: holidayMap    = Object.fromEntries(holidays.map(h => [h.date, h.name]))
  $: empLeaves     = allLeaves.filter(l => l.employee?.id === employee?.id || l.employeeId === employee?.id)

  $: daysInMonth = getDaysInMonth(currentYear, currentMonth)
  $: firstDay    = getFirstDayOfMonth(currentYear, currentMonth)
  $: todayStr    = new Date().toISOString().split('T')[0]

  // Attendance stats from records
  $: presentDays  = attendanceHistory.filter(r => r.status === 'full_day' || r.status === 'overtime').length
  $: halfDays     = attendanceHistory.filter(r => r.status === 'half_day').length
  $: absentDays   = attendanceHistory.filter(r => r.status === 'absent').length
  $: totalWorking = (() => {
    let count = 0
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      if (new Date(dateStr) > new Date()) break
      const dow = new Date(currentYear, currentMonth - 1, d).getDay()
      if (dow !== 0 && dow !== 6 && !holidayMap[dateStr]) count++
    }
    return count
  })()
  $: attendancePct = totalWorking > 0
    ? Math.round(((presentDays + halfDays * 0.5) / totalWorking) * 100)
    : 0

  async function loadAttendance() {
    loadingAtt = true
    try {
      attendanceHistory = await api.getEmployeeAttendance(employee.id, currentMonth, currentYear)
    } catch { attendanceHistory = [] }
    finally { loadingAtt = false }
  }

  async function loadLeaveBalance() {
    loadingBal = true
    try {
      leaveBalance = await api.getEmployeeLeaveBalance(employee.id, currentYear)
    } catch { leaveBalance = null }
    finally { loadingBal = false }
  }

  onMount(() => {
    loadAttendance()
    loadLeaveBalance()
  })

  function prevMonth() {
    if (currentMonth === 1) { currentMonth = 12; currentYear-- }
    else currentMonth--
    loadAttendance()
  }
  function nextMonth() {
    if (currentMonth === 12) { currentMonth = 1; currentYear++ }
    else currentMonth++
    loadAttendance()
  }

  function getDayStatus(day: number): string {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    if (holidayMap[dateStr]) return 'holiday'
    const dow = new Date(currentYear, currentMonth - 1, day).getDay()
    if (dow === 0 || dow === 6) return 'weekend'
    return attendanceMap[dateStr] || 'none'
  }

  function getDayClass(status: string): string {
    const map: Record<string, string> = {
      full_day: 'bg-emerald-500 text-white',
      overtime: 'bg-purple-500 text-white',
      half_day: 'bg-amber-400 text-white',
      absent:   'bg-red-400 text-white',
      holiday:  'bg-blue-500 text-white',
      weekend:  'bg-[var(--color-subtle)] text-gray-400 dark:text-gray-500',
      none:     'bg-[var(--color-faint)] text-gray-500 dark:text-gray-400',
    }
    return map[status] || map.none
  }

  const leaveTypes = [
    { key: 'sickLeave',   usedKey: 'sickUsed',   label: 'Sick Leave',      color: 'red' },
    { key: 'casualLeave', usedKey: 'casualUsed', label: 'Casual Leave',    color: 'blue' },
    { key: 'earnedLeave', usedKey: 'earnedUsed', label: 'Earned Leave',    color: 'green' },
    { key: 'wfhLeave',    usedKey: 'wfhUsed',    label: 'Work From Home',  color: 'purple' },
  ]
</script>

<!-- Backdrop -->
<div class="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto"
  on:click|self={onClose} role="dialog" aria-modal="true">

  <div class="bg-modal border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-2xl my-6">

    <!-- Header -->
    <div class="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
      <div class="flex items-center gap-3">
        {#if employee.avatar}
          <img src={employee.avatar} alt={employee.name} class="w-12 h-12 rounded-full object-cover flex-shrink-0" />
        {:else}
          <div class="w-12 h-12 bg-brand-600 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
            {employee.name?.charAt(0)?.toUpperCase()}
          </div>
        {/if}
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">{employee.name}</h2>
            <span class="badge {employee.isActive !== false ? 'badge-green' : 'badge-red'} text-xs">
              {employee.isActive !== false ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {employee.employeeCode}
            {#if employee.department} · {employee.department}{/if}
            {#if employee.designation} · {employee.designation}{/if}
          </p>
          {#if employee.joinDate}
            <p class="text-xs text-gray-400 dark:text-gray-500">Joined {formatDate(employee.joinDate)}</p>
          {/if}
        </div>
      </div>
      <button on:click={onClose}
        class="p-2 hover:bg-[var(--color-subtle)] rounded-lg text-gray-500 dark:text-gray-400 flex-shrink-0">
        <X size={18} />
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 px-5 pt-4 border-b border-[var(--color-border)]">
      <button on:click={() => activeTab = 'attendance'}
        class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2
          {activeTab === 'attendance'
            ? 'border-brand-500 text-brand-600 dark:text-brand-400'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}">
        <Calendar size={14} /> Attendance
      </button>
      <button on:click={() => activeTab = 'leaves'}
        class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2
          {activeTab === 'leaves'
            ? 'border-brand-500 text-brand-600 dark:text-brand-400'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}">
        <Umbrella size={14} /> Leaves
        {#if empLeaves.filter(l => l.status === 'pending').length > 0}
          <span class="ml-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
            {empLeaves.filter(l => l.status === 'pending').length}
          </span>
        {/if}
      </button>
    </div>

    <!-- ═══════════ ATTENDANCE TAB ═══════════ -->
    {#if activeTab === 'attendance'}
      <div class="p-5 space-y-5">

        <!-- Month navigator -->
        <div class="flex items-center justify-between">
          <button on:click={prevMonth}
            class="p-1.5 rounded-lg hover:bg-[var(--color-subtle)] text-gray-600 dark:text-gray-300 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 text-base">
            {MONTHS[currentMonth - 1]} {currentYear}
          </h3>
          <button on:click={nextMonth}
            class="p-1.5 rounded-lg hover:bg-[var(--color-subtle)] text-gray-600 dark:text-gray-300 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        <!-- Stats row -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {#each [
            { icon: Clock,      label: 'Working Days', value: totalWorking,    color: 'text-brand-600 dark:text-brand-400',   bg: 'bg-brand-500/10' },
            { icon: UserCheck,  label: 'Present',      value: presentDays,     color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
            { icon: UserX,      label: 'Absent',       value: absentDays,      color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-500/10' },
            { icon: TrendingUp, label: 'Attendance %', value: `${attendancePct}%`, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
          ] as s}
            <div class="rounded-xl p-3 text-center {s.bg}">
              <svelte:component this={s.icon} size={16} class="{s.color} mx-auto mb-1" />
              <div class="text-xl font-bold {s.color}">{s.value}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</div>
            </div>
          {/each}
        </div>

        <!-- Calendar -->
        {#if loadingAtt}
          <div class="h-48 animate-pulse rounded-xl bg-[var(--color-faint)]"></div>
        {:else}
          <!-- Day headers -->
          <div class="grid grid-cols-7 gap-1 mb-1">
            {#each DAYS as d}
              <div class="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">{d}</div>
            {/each}
          </div>
          <!-- Day cells -->
          <div class="grid grid-cols-7 gap-1">
            {#each Array(firstDay) as _}
              <div></div>
            {/each}
            {#each Array.from({ length: daysInMonth }, (_, i) => i + 1) as day}
              {@const dateStr = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`}
              {@const status = getDayStatus(day)}
              <div class="relative aspect-square flex items-center justify-center rounded-lg text-sm font-medium
                {getDayClass(status)}
                {dateStr === todayStr ? 'ring-2 ring-brand-500 ring-offset-1 ring-offset-card' : ''}">
                {day}
                {#if holidayMap[dateStr]}
                  <span class="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white opacity-80"></span>
                {/if}
              </div>
            {/each}
          </div>

          <!-- Legend -->
          <div class="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 pt-1">
            {#each [
              { color: 'bg-emerald-500', label: 'Present' },
              { color: 'bg-amber-400',   label: 'Half Day' },
              { color: 'bg-purple-500',  label: 'Overtime' },
              { color: 'bg-red-400',     label: 'Absent' },
              { color: 'bg-blue-500',    label: 'Holiday' },
              { color: 'bg-[var(--color-subtle)]', label: 'Weekend' },
            ] as item}
              <span class="flex items-center gap-1.5">
                <span class="w-3 h-3 rounded-sm {item.color}"></span>
                {item.label}
              </span>
            {/each}
          </div>
        {/if}

        <!-- Recent records list -->
        {#if attendanceHistory.length > 0}
          <div class="border border-[var(--color-border)] rounded-xl overflow-hidden">
            <div class="bg-[var(--color-faint)] px-4 py-2.5 border-b border-[var(--color-border)]">
              <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Daily Records</p>
            </div>
            <div class="divide-y divide-[var(--color-divide)] max-h-48 overflow-y-auto">
              {#each [...attendanceHistory].reverse() as record}
                {@const badge = (() => {
                  const m: Record<string, {cls: string, label: string}> = {
                    full_day: { cls: 'badge-green',  label: 'Present' },
                    overtime: { cls: 'badge-purple', label: 'Overtime' },
                    half_day: { cls: 'badge-yellow', label: 'Half Day' },
                    absent:   { cls: 'badge-red',    label: 'Absent' },
                  }
                  return m[record.status] ?? { cls: 'badge-gray', label: record.status }
                })()}
                <div class="flex items-center px-4 py-2.5 text-sm">
                  <span class="text-gray-700 dark:text-gray-300 font-medium w-32 flex-shrink-0">
                    {new Date(record.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                  <span class="text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">{formatTime(record.punchIn)}</span>
                  <span class="text-gray-400 dark:text-gray-500 w-24 flex-shrink-0">{formatTime(record.punchOut)}</span>
                  <span class="text-gray-400 dark:text-gray-500 flex-1">{record.workingHours ? formatHours(record.workingHours) : '-'}</span>
                  <span class="badge {badge.cls}">{badge.label}</span>
                </div>
              {/each}
            </div>
          </div>
        {:else if !loadingAtt}
          <p class="text-sm text-center text-gray-400 dark:text-gray-500 py-6">
            No attendance records for {MONTHS[currentMonth - 1]} {currentYear}
          </p>
        {/if}

      </div>
    {/if}

    <!-- ═══════════ LEAVES TAB ═══════════ -->
    {#if activeTab === 'leaves'}
      <div class="p-5 space-y-5">

        <!-- Leave balance -->
        {#if loadingBal}
          <div class="h-24 animate-pulse rounded-xl bg-[var(--color-faint)]"></div>
        {:else if leaveBalance}
          <div>
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Leave Balance · {currentYear}</p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {#each leaveTypes as lt}
                {@const total    = leaveBalance[lt.key]   ?? 0}
                {@const used     = leaveBalance[lt.usedKey] ?? 0}
                {@const remaining = total - used}
                {@const pct = total > 0 ? Math.round((used / total) * 100) : 0}
                <div class="card p-3">
                  <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 leading-tight">{lt.label}</p>
                  <p class="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                    {remaining}<span class="text-xs text-gray-400 dark:text-gray-500 font-normal ml-0.5">/{total}</span>
                  </p>
                  <div class="w-full bg-[var(--color-subtle)] rounded-full h-1 mt-2">
                    <div class="h-1 rounded-full bg-{lt.color}-500 transition-all" style="width:{pct}%"></div>
                  </div>
                  <p class="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{used} used</p>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <p class="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Leave balance not set for this employee.</p>
        {/if}

        <!-- Leave history -->
        <div>
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Leave Requests</p>
          {#if empLeaves.length === 0}
            <div class="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
              No leave requests from {employee.name?.split(' ')[0]}
            </div>
          {:else}
            <div class="border border-[var(--color-border)] rounded-xl overflow-hidden">
              <div class="divide-y divide-[var(--color-divide)]">
                {#each empLeaves.slice().reverse() as leave}
                  {@const typeBadge   = getLeaveTypeBadge(leave.leaveType)}
                  {@const statusBadge = getLeaveStatusBadge(leave.status)}
                  <div class="px-4 py-3 flex items-start gap-3">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="{typeBadge.class}">{typeBadge.label}</span>
                        <span class="{statusBadge.class}">{statusBadge.label}</span>
                        <span class="text-xs text-gray-400 dark:text-gray-500">{leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}</span>
                      </div>
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                      </p>
                      {#if leave.reason}
                        <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{leave.reason}</p>
                      {/if}
                      {#if leave.rejectionReason}
                        <p class="text-xs text-red-500 dark:text-red-400 mt-0.5">Rejected: {leave.rejectionReason}</p>
                      {/if}
                    </div>
                    <p class="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 text-right">
                      {new Date(leave.createdAt || leave.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>

      </div>
    {/if}

  </div>
</div>
