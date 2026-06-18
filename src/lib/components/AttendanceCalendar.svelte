<script lang="ts">
  import { ChevronLeft, ChevronRight } from 'lucide-svelte'
  import { getDaysInMonth, getFirstDayOfMonth, MONTHS } from '$lib/utils'

  export let year: number = new Date().getFullYear()
  export let month: number = new Date().getMonth() + 1
  export let attendanceMap: Record<string, string> = {}
  export let holidayMap: Record<string, string> = {}
  export let onMonthChange: (year: number, month: number) => void = () => {}

  $: daysInMonth = getDaysInMonth(year, month)
  $: firstDay = getFirstDayOfMonth(year, month)
  $: today = new Date().toISOString().split('T')[0]

  function prev() {
    let m = month - 1, y = year
    if (m < 1) { m = 12; y-- }
    onMonthChange(y, m)
  }
  function next() {
    let m = month + 1, y = year
    if (m > 12) { m = 1; y++ }
    onMonthChange(y, m)
  }

  function getDayStatus(day: number): string {
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    if (holidayMap[dateStr]) return 'holiday'
    const dow = new Date(year, month - 1, day).getDay()
    if (dow === 0) return 'weekend'
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
      none:     'bg-[var(--color-faint)] text-gray-600 dark:text-gray-300 hover:bg-[var(--color-subtle)]',
    }
    return map[status] || map.none
  }

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
</script>

<div class="card">
  <div class="flex items-center justify-between mb-5">
    <button on:click={prev} class="p-2 rounded-lg hover:bg-[var(--color-subtle)] transition-colors text-gray-600 dark:text-gray-300">
      <ChevronLeft size={18} />
    </button>
    <h3 class="font-semibold text-gray-900 dark:text-gray-100 text-lg">{MONTHS[month - 1]} {year}</h3>
    <button on:click={next} class="p-2 rounded-lg hover:bg-[var(--color-subtle)] transition-colors text-gray-600 dark:text-gray-300">
      <ChevronRight size={18} />
    </button>
  </div>

  <div class="grid grid-cols-7 gap-1 mb-2">
    {#each DAYS as d}
      <div class="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">{d}</div>
    {/each}
  </div>

  <div class="grid grid-cols-7 gap-1">
    {#each Array(firstDay) as _}
      <div></div>
    {/each}
    {#each Array.from({ length: daysInMonth }, (_, i) => i + 1) as day}
      {@const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`}
      {@const status = getDayStatus(day)}
      <div class="relative aspect-square flex items-center justify-center rounded-lg text-sm font-medium
        {getDayClass(status)}
        {dateStr === today ? 'ring-2 ring-brand-500 ring-offset-1 ring-offset-card' : ''}">
        {day}
        {#if holidayMap[dateStr]}
          <span class="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white opacity-80"></span>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Legend -->
  <div class="mt-4 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
    {#each [
      { color: 'bg-emerald-500', label: 'Present' },
      { color: 'bg-amber-400', label: 'Half Day' },
      { color: 'bg-purple-500', label: 'Overtime' },
      { color: 'bg-red-400', label: 'Absent' },
      { color: 'bg-blue-500', label: 'Holiday' },
      { color: 'bg-[var(--color-subtle)]', label: 'Weekend' },
    ] as item}
      <span class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-sm {item.color}"></span>
        {item.label}
      </span>
    {/each}
  </div>
</div>
