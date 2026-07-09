<script lang="ts">
  import { onMount } from 'svelte'
  import { user, isAdmin } from '$lib/stores/auth'
  import { api } from '$lib/api'
  import AttendanceCalendar from '$lib/components/AttendanceCalendar.svelte'
  import StatsCard from '$lib/components/StatsCard.svelte'
  import EmployeeProfileModal from '$lib/components/EmployeeProfileModal.svelte'
  import AdminMarkAttendanceModal from '$lib/components/AdminMarkAttendanceModal.svelte'
  import DateRangeModal from '$lib/components/DateRangeModal.svelte'
  import { Calendar, Clock, TrendingUp, Umbrella, Users, UserCheck, UserX, ClipboardList, Check, XCircle, PenLine, Download } from 'lucide-svelte'
  import { formatDate, formatTime, getLeaveTypeBadge, downloadCSV, MONTHS } from '$lib/utils'

  let selectedEmployee: any = null
  let markAttModal: { show: boolean; employee: any } = { show: false, employee: null }
  let exportLoading = false
  let showExportRangeModal = false

  async function exportAllCSV(startDate: string, endDate: string) {
    try {
      exportLoading = true
      const data = await api.getExportAll(startDate, endDate)
      const recMap: Record<string, Record<number, any>> = {}
      for (const r of data.records) {
        if (!recMap[r.date]) recMap[r.date] = {}
        recMap[r.date][r.employeeId] = r
      }
      const header   = ['Employee', 'Code', 'Department', 'Date', 'Day', 'Punch In', 'Punch Out', 'Hours', 'Status']
      const rows: string[][] = []
      for (const emp of data.employees) {
        for (let d = new Date(startDate + 'T00:00:00'); d <= new Date(endDate + 'T00:00:00'); d.setDate(d.getDate() + 1)) {
          if (d > new Date()) break
          if (d.getDay() === 0) continue
          const dateStr = d.toISOString().split('T')[0]
          const r = recMap[dateStr]?.[emp.id]
          const dayName = d.toLocaleDateString('en-IN', { weekday: 'long' })
          const statusLabel = !r ? 'Absent'
            : r.punchIn && !r.punchOut ? 'In Office'
            : (({ full_day: 'Full Day', half_day: 'Half Day', overtime: 'Overtime', absent: 'Absent', on_leave: 'On Leave' } as Record<string, string>)[r?.status] ?? r?.status)
          const hrs = r?.workingHours ? `${Math.floor(Number(r.workingHours))}h ${Math.round((Number(r.workingHours) % 1) * 60)}m` : '-'
          rows.push([emp.name, emp.employeeCode, emp.department ?? '-', dateStr, dayName,
            r?.punchIn  ? new Date(r.punchIn).toLocaleTimeString('en-IN',  { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--',
            r?.punchOut ? new Date(r.punchOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--',
            hrs, statusLabel])
        }
      }
      downloadCSV(`Attendance_${data.startDate}_to_${data.endDate}.csv`, [header, ...rows])
      showExportRangeModal = false
    } finally {
      exportLoading = false
    }
  }

  // shared
  let holidays: any[] = []
  let loading = true
  let currentMonth = new Date().getMonth() + 1
  let currentYear = new Date().getFullYear()

  // employee-only
  let summary: any = null
  let leaveBalance: any = null
  let attendanceHistory: any[] = []

  // admin-only
  let todayAll: any[] = []
  let allLeaves: any[] = []
  let rejectModal: { id: number; show: boolean } = { id: 0, show: false }
  let rejectReason = ''

  $: attendanceMap = Object.fromEntries(attendanceHistory.map(r => [r.date, r.status]))
  $: approvedHolidays = holidays.filter(h => h.isApproved)
  $: holidayMap = Object.fromEntries(approvedHolidays.map(h => [h.date, h.name]))

  $: presentToday = todayAll.filter(e => e.todayAttendance?.punchIn).length
  $: absentToday = todayAll.filter(e => !e.todayAttendance?.punchIn).length
  $: pendingLeaves = allLeaves.filter(l => l.status === 'pending').length
  // Platform start = earliest createdAt among non-admin employees
  $: platformStart = todayAll.length > 0
    ? todayAll.reduce((earliest: Date, e: any) => {
        const d = new Date(e.createdAt); d.setHours(0, 0, 0, 0)
        return d < earliest ? d : earliest
      }, new Date(todayAll[0].createdAt))
    : null

  $: leaveRemaining = leaveBalance
    ? (leaveBalance.sickLeave - leaveBalance.sickUsed) +
      (leaveBalance.casualLeave - leaveBalance.casualUsed) +
      (leaveBalance.earnedLeave - leaveBalance.earnedUsed)
    : 0

  let profileRefreshTrigger = 0

  async function loadAdmin() {
    const [emps, hols, leaves] = await Promise.all([
      api.getTodayAll(),
      api.getHolidays(currentYear),
      api.getAllLeaves(),
    ])
    todayAll = emps
    holidays = hols
    allLeaves = leaves
  }

  async function onAdminSaved() {
    await loadAdmin()
    profileRefreshTrigger++
  }

  async function loadEmployee(year: number, month: number) {
    const [hist, sum, hols, lb] = await Promise.all([
      api.getAttendanceHistory(month, year),
      api.getAttendanceSummary(month, year),
      api.getHolidays(year),
      api.getLeaveBalance(year),
    ])
    attendanceHistory = hist
    summary = sum
    holidays = hols
    leaveBalance = lb
  }

  onMount(async () => {
    try {
      if ($isAdmin) await loadAdmin()
      else await loadEmployee(currentYear, currentMonth)
    } finally { loading = false }
  })

  function onMonthChange(y: number, m: number) {
    currentYear = y; currentMonth = m
    if (!$isAdmin) loadEmployee(y, m)
  }

  async function approveLeave(id: number) {
    await api.approveLeave(id)
    allLeaves = await api.getAllLeaves()
  }

  async function rejectLeave() {
    if (!rejectReason) return
    await api.rejectLeave(rejectModal.id, rejectReason)
    rejectModal = { id: 0, show: false }; rejectReason = ''
    allLeaves = await api.getAllLeaves()
  }

  $: greeting = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'
</script>

<svelte:head><title>Dashboard · Coadal Attendance</title></svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Good {greeting}, {$user?.name?.split(' ')[0]}!</h1>
    <p class="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
  </div>

  {#if loading}
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {#each Array(4) as _}
        <div class="card animate-pulse h-24"></div>
      {/each}
    </div>
  {:else if $isAdmin}
    <!-- ═══════════════════ ADMIN DASHBOARD ═══════════════════ -->

    <!-- Stats row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard label="Total Employees" value={todayAll.length}
        sub="active staff" color="blue" icon={Users} />
      <StatsCard label="Present Today" value={presentToday}
        sub="punched in" color="green" icon={UserCheck} />
      <StatsCard label="Absent Today" value={absentToday}
        sub="not punched in" color="red" icon={UserX} />
      <StatsCard label="Pending Leaves" value={pendingLeaves}
        sub="awaiting approval" color="yellow" icon={ClipboardList} />
    </div>

    <!-- Today's employee attendance table -->
    <div class="card overflow-hidden p-0">
      <div class="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <h2 class="font-semibold text-gray-900 dark:text-gray-100">Today's Attendance</h2>
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-400 dark:text-gray-500">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          <button on:click={() => showExportRangeModal = true} disabled={exportLoading}
            class="btn-secondary py-1.5 px-3 text-sm flex items-center gap-1.5">
            <Download size={14} /> {exportLoading ? 'Downloading...' : 'Export CSV'}
          </button>
          <button on:click={() => markAttModal = { show: true, employee: null }}
            class="btn-primary py-1.5 px-3 text-sm flex items-center gap-1.5">
            <PenLine size={14} /> Mark Attendance
          </button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-[var(--color-faint)]">
            <tr>
              {#each ['Employee', 'Department', 'Punch In', 'Punch Out', 'Hours', 'Status', ''] as h}
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{h}</th>
              {/each}
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-divide)]">
            {#each todayAll as emp}
              {@const att = emp.todayAttendance}
              <tr class="hover:bg-[var(--color-faint)] transition-colors cursor-pointer"
                on:click={() => selectedEmployee = emp}>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    {#if emp.avatar}
                      <img src={emp.avatar} alt={emp.name} class="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    {:else}
                      <div class="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {emp.name.charAt(0)}
                      </div>
                    {/if}
                    <div>
                      <p class="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline">{emp.name}</p>
                      <p class="text-xs text-gray-400 dark:text-gray-500">{emp.employeeCode}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{emp.department || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-200 font-medium">
                  {#if att?.punchIn}{formatTime(att.punchIn)}{:else}<span class="text-gray-300 dark:text-white/20">--:--</span>{/if}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                  {#if att?.punchOut}{formatTime(att.punchOut)}{:else}<span class="text-gray-300 dark:text-white/20">--:--</span>{/if}
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {att?.workingHours ? `${Number(att.workingHours).toFixed(1)}h` : '-'}
                </td>
                <td class="px-4 py-3">
                  {#if att?.punchIn && !att.punchOut}
                    <span class="badge badge-green">In Office</span>
                  {:else if att?.punchOut}
                    <span class="badge badge-blue">Checked Out</span>
                  {:else if att?.status === 'on_leave'}
                    <span class="badge badge-indigo">On Leave</span>
                  {:else}
                    <span class="badge badge-red">Absent</span>
                  {/if}
                </td>
                <td class="px-4 py-3">
                  <button
                    on:click|stopPropagation={() => markAttModal = { show: true, employee: emp }}
                    class="p-1.5 text-brand-600 dark:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors"
                    title="Attendance mark karo">
                    <PenLine size={14} />
                  </button>
                </td>
              </tr>
            {:else}
              <tr>
                <td colspan="7" class="px-4 py-10 text-center text-gray-400 dark:text-gray-500 text-sm">No employees found</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pending leaves + Upcoming holidays -->
    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Pending Leave Requests -->
      <div class="card overflow-hidden p-0">
        <div class="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 class="font-semibold text-gray-900 dark:text-gray-100">Pending Leave Requests</h2>
          {#if pendingLeaves > 0}
            <span class="badge badge-yellow">{pendingLeaves} pending</span>
          {/if}
        </div>
        <div class="divide-y divide-[var(--color-divide)]">
          {#each allLeaves.filter(l => l.status === 'pending').slice(0, 6) as leave}
            {@const typeBadge = getLeaveTypeBadge(leave.leaveType)}
            <div class="px-5 py-3 flex items-center gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{leave.employee?.name}</p>
                <p class="text-xs text-gray-400 dark:text-gray-500">
                  <span class="{typeBadge.class} mr-1.5">{typeBadge.label}</span>
                  {formatDate(leave.startDate)} → {formatDate(leave.endDate)} · {leave.totalDays}d
                </p>
              </div>
              <div class="flex items-center gap-1 flex-shrink-0">
                <button on:click={() => approveLeave(leave.id)}
                  class="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 rounded-lg transition-colors" title="Approve">
                  <Check size={14} />
                </button>
                <button on:click={() => { rejectModal = { id: leave.id, show: true } }}
                  class="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/15 rounded-lg transition-colors" title="Reject">
                  <XCircle size={14} />
                </button>
              </div>
            </div>
          {:else}
            <p class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No pending requests</p>
          {/each}
        </div>
      </div>

      <!-- Upcoming Holidays -->
      <div class="card overflow-hidden p-0">
        <div class="px-6 py-4 border-b border-[var(--color-border)]">
          <h2 class="font-semibold text-gray-900 dark:text-gray-100">Upcoming Holidays</h2>
        </div>
        <div class="divide-y divide-[var(--color-divide)]">
          {#each approvedHolidays.filter(h => new Date(h.date) >= new Date()).slice(0, 6) as h}
            <div class="px-5 py-3 flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{h.name}</p>
                <p class="text-xs text-gray-400 dark:text-gray-500">{formatDate(h.date)}</p>
              </div>
              <span class="badge badge-blue">Holiday</span>
            </div>
          {:else}
            <p class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No upcoming holidays</p>
          {/each}
        </div>
      </div>
    </div>

  {:else}
    <!-- ═══════════════════ EMPLOYEE DASHBOARD ═══════════════════ -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard label="Working Days" value={summary?.totalWorkingDays ?? '-'}
        sub="This month" color="blue" icon={Calendar} />
      <StatsCard label="Present Days" value={summary?.presentDays ?? '-'}
        sub="{summary?.halfDays ?? 0} half days" color="green" icon={Clock} />
      <StatsCard label="Attendance %" value="{summary?.attendancePercent ?? 0}%"
        sub="{summary?.totalHours ?? 0} total hours" color="purple" icon={TrendingUp} />
      <StatsCard label="Leave Balance" value={leaveRemaining}
        sub="days remaining" color="yellow" icon={Umbrella} />
    </div>

    <AttendanceCalendar
      year={currentYear} month={currentMonth}
      {attendanceMap} {holidayMap}
      onMonthChange={onMonthChange} />
  {/if}
</div>

<!-- Export CSV Date Range Modal -->
{#if showExportRangeModal}
  <DateRangeModal
    title="Export All Attendance"
    loading={exportLoading}
    onConfirm={exportAllCSV}
    onClose={() => showExportRangeModal = false}
  />
{/if}

<!-- Admin Mark Attendance Modal -->
{#if markAttModal.show}
  <AdminMarkAttendanceModal
    employees={todayAll}
    preselectedEmployee={markAttModal.employee}
    onClose={() => markAttModal = { show: false, employee: null }}
    onSaved={onAdminSaved}
  />
{/if}

<!-- Employee Profile Modal -->
{#if selectedEmployee}
  <EmployeeProfileModal
    employee={selectedEmployee}
    {allLeaves}
    holidays={approvedHolidays}
    {platformStart}
    refreshTrigger={profileRefreshTrigger}
    onClose={() => selectedEmployee = null}
  />
{/if}

<!-- Reject Leave Modal -->
{#if rejectModal.show}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div class="bg-modal border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-sm p-6">
      <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">Reject Leave Request</h3>
      <label for="dash-reject-reason" class="label">Reason for rejection</label>
      <textarea id="dash-reject-reason" bind:value={rejectReason} class="input resize-none" rows="3" placeholder="Enter reason..."></textarea>
      <div class="flex gap-3 mt-4">
        <button on:click={() => { rejectModal = { id: 0, show: false }; rejectReason = '' }} class="btn-secondary flex-1 justify-center">Cancel</button>
        <button on:click={rejectLeave} disabled={!rejectReason} class="btn-danger flex-1 justify-center">Reject</button>
      </div>
    </div>
  </div>
{/if}
