<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { api } from '$lib/api'
  import { formatTime, formatHours, getStatusBadge, MONTHS } from '$lib/utils'
  import AttendanceCalendar from '$lib/components/AttendanceCalendar.svelte'
  import PunchCard from '$lib/components/PunchCard.svelte'
  import { isAdmin } from '$lib/stores/auth'
  import { ChevronDown } from 'lucide-svelte'

  let history: any[] = []
  let holidays: any[] = []
  let todayRecord: any = null
  let summary: any = null
  let currentMonth = new Date().getMonth() + 1
  let currentYear = new Date().getFullYear()
  let loading = true

  $: attendanceMap = Object.fromEntries(history.map(r => [r.date, r.status]))
  $: holidayMap = Object.fromEntries(holidays.filter(h => h.isApproved).map(h => [h.date, h.name]))

  async function load(year: number, month: number) {
    loading = true
    try {
      const [hist, hols, sum, today] = await Promise.all([
        api.getAttendanceHistory(month, year),
        api.getHolidays(year),
        api.getAttendanceSummary(month, year),
        api.getTodayAttendance(),
      ])
      history = hist; holidays = hols; summary = sum; todayRecord = today
    } finally {
      loading = false
    }
  }

  onMount(() => {
    if ($isAdmin) { goto('/dashboard'); return }
    load(currentYear, currentMonth)
  })

  function onMonthChange(y: number, m: number) {
    currentYear = y; currentMonth = m
    load(y, m)
  }
</script>

<svelte:head><title>Attendance · Coadal Attendance</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">My Attendance</h1>
    <div class="flex items-center gap-2">
      <select bind:value={currentMonth} on:change={() => load(currentYear, currentMonth)}
        class="input py-1.5 text-sm w-auto">
        {#each MONTHS as m, i}
          <option value={i + 1}>{m}</option>
        {/each}
      </select>
      <select bind:value={currentYear} on:change={() => load(currentYear, currentMonth)}
        class="input py-1.5 text-sm w-auto">
        {#each [2023, 2024, 2025, 2026] as y}
          <option value={y}>{y}</option>
        {/each}
      </select>
    </div>
  </div>

  {#if loading}
    <div class="card animate-pulse h-48"></div>
  {:else}
    <!-- Summary row -->
    {#if summary}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {#each [
          { label: 'Working Days', value: summary.totalWorkingDays, color: 'text-brand-600 dark:text-brand-400 bg-brand-500/10' },
          { label: 'Present', value: summary.presentDays, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
          { label: 'Absent', value: summary.absentDays, color: 'text-red-600 dark:text-red-400 bg-red-500/10' },
          { label: 'Attendance %', value: `${summary.attendancePercent}%`, color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10' },
        ] as s}
          <div class="card text-center py-4 {s.color}">
            <div class="text-2xl font-bold">{s.value}</div>
            <div class="text-xs font-medium mt-0.5">{s.label}</div>
          </div>
        {/each}
      </div>
    {/if}

    <div class="grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-1">
        <PunchCard {todayRecord} onUpdate={(r) => { todayRecord = r; load(currentYear, currentMonth) }} />
      </div>
      <div class="lg:col-span-2">
        <AttendanceCalendar year={currentYear} month={currentMonth}
          {attendanceMap} {holidayMap} onMonthChange={onMonthChange} />
      </div>
    </div>

    <!-- History table -->
    <div class="card overflow-hidden p-0">
      <div class="px-6 py-4 border-b border-[var(--color-border)]">
        <h2 class="font-semibold text-gray-900 dark:text-gray-100">Attendance History</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-[var(--color-faint)]">
            <tr>
              {#each ['Date', 'Punch In', 'Punch Out', 'Hours', 'Status', 'Notes'] as h}
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{h}</th>
              {/each}
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-divide)]">
            {#each history as record}
              {@const badge = getStatusBadge(record.status)}
              <tr class="hover:bg-[var(--color-faint)] transition-colors">
                <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {new Date(record.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatTime(record.punchIn)}</td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatTime(record.punchOut)}</td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{record.workingHours ? formatHours(record.workingHours) : '-'}</td>
                <td class="px-4 py-3">
                  <span class="{badge.class}">{badge.label}</span>
                </td>
                <td class="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">{record.notes || '-'}</td>
              </tr>
            {:else}
              <tr>
                <td colspan="6" class="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">No attendance records for this period</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
