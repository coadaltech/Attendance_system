<script lang="ts">
  import { api } from '$lib/api'
  import { X } from 'lucide-svelte'

  export let employees: any[] = []
  export let preselectedEmployee: any = null
  export let onClose: () => void
  export let onSaved: () => void

  let employeeId: number = preselectedEmployee?.id ?? (employees[0]?.id ?? 0)
  let date: string = new Date().toISOString().split('T')[0]

  function toTimeStr(ts: string | null | undefined) {
    if (!ts) return ''
    const d = new Date(ts)
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  const existing = preselectedEmployee?.todayAttendance
  let punchIn  = toTimeStr(existing?.punchIn)
  let punchOut = toTimeStr(existing?.punchOut)
  let status   = existing?.status ?? ''
  let notes    = existing?.notes  ?? ''
  let loading  = false
  let error    = ''

  $: if (preselectedEmployee) employeeId = preselectedEmployee.id

  async function save() {
    if (!employeeId || !date) { error = 'Employee aur date zaroori hai'; return }
    if (punchIn && punchOut && punchOut <= punchIn) {
      error = 'Punch out time, punch in se baad honi chahiye'; return
    }
    try {
      loading = true; error = ''
      await api.adminMarkAttendance({
        employeeId,
        date,
        punchIn:  punchIn  || undefined,
        punchOut: punchOut || undefined,
        status:   status   || undefined,
        notes:    notes    || undefined,
      })
      onSaved()
      onClose()
    } catch (e: any) {
      error = e.message || 'Kuch galat ho gaya'
    } finally {
      loading = false
    }
  }
</script>

<div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
  <div class="bg-modal border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md p-6">

    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <h3 class="font-semibold text-gray-900 dark:text-gray-100 text-lg">Attendance Mark Karo</h3>
      <button on:click={onClose} class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors">
        <X size={18} />
      </button>
    </div>

    <div class="space-y-4">
      <!-- Employee -->
      <div>
        <label for="am-emp" class="label">Employee</label>
        {#if preselectedEmployee}
          <div class="input flex items-center gap-2 bg-[var(--color-faint)] cursor-default">
            <div class="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {preselectedEmployee.name.charAt(0)}
            </div>
            <span class="text-sm">{preselectedEmployee.name}</span>
          </div>
        {:else}
          <select id="am-emp" bind:value={employeeId} class="input">
            {#each employees as emp}
              <option value={emp.id}>{emp.name} ({emp.employeeCode})</option>
            {/each}
          </select>
        {/if}
      </div>

      <!-- Date -->
      <div>
        <label for="am-date" class="label">Date</label>
        <input id="am-date" type="date" bind:value={date} class="input"
          max={new Date().toISOString().split('T')[0]} />
      </div>

      <!-- Punch In / Punch Out -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="am-in" class="label">Punch In <span class="text-gray-400 font-normal">(optional)</span></label>
          <input id="am-in" type="time" bind:value={punchIn} class="input" />
        </div>
        <div>
          <label for="am-out" class="label">Punch Out <span class="text-gray-400 font-normal">(optional)</span></label>
          <input id="am-out" type="time" bind:value={punchOut} class="input" />
        </div>
      </div>

      <!-- Status override -->
      <div>
        <label for="am-status" class="label">Status <span class="text-gray-400 font-normal">(auto-calculate hoga agar times diye)</span></label>
        <select id="am-status" bind:value={status} class="input">
          <option value="">— Auto —</option>
          <option value="full_day">Full Day</option>
          <option value="half_day">Half Day</option>
          <option value="overtime">Overtime</option>
          <option value="absent">Absent</option>
        </select>
      </div>

      <!-- Notes -->
      <div>
        <label for="am-notes" class="label">Notes <span class="text-gray-400 font-normal">(optional)</span></label>
        <input id="am-notes" type="text" bind:value={notes} class="input" placeholder="e.g. Admin ne manually mark kiya" />
      </div>

      {#if error}
        <p class="text-red-500 dark:text-red-400 text-sm">{error}</p>
      {/if}
    </div>

    <div class="flex gap-3 mt-6">
      <button on:click={onClose} class="btn-secondary flex-1 justify-center">Cancel</button>
      <button on:click={save} disabled={loading} class="btn-primary flex-1 justify-center">
        {loading ? 'Saving...' : 'Save Karo'}
      </button>
    </div>
  </div>
</div>
