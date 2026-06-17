<script lang="ts">
  import { onMount } from 'svelte'
  import { isAdmin } from '$lib/stores/auth'
  import { api } from '$lib/api'
  import { formatDate } from '$lib/utils'
  import { Plus, X, Check, Trash2, EyeOff, CalendarDays } from 'lucide-svelte'

  let holidays: any[] = []
  let loading = true
  let showAdd = false
  let saving = false
  let formError = ''
  let currentYear = new Date().getFullYear()

  let form = { date: '', name: '', description: '', isOptional: false }

  onMount(async () => { await loadHolidays() })

  async function loadHolidays() {
    loading = true
    try { holidays = await api.getHolidays(currentYear) }
    finally { loading = false }
  }

  async function addHoliday() {
    if (!form.date || !form.name) { formError = 'Date and name are required'; return }
    try {
      saving = true; formError = ''
      await api.createHoliday(form)
      showAdd = false
      form = { date: '', name: '', description: '', isOptional: false }
      await loadHolidays()
    } catch (e: any) {
      formError = e.message
    } finally { saving = false }
  }

  async function approve(id: number) {
    await api.approveHoliday(id)
    await loadHolidays()
  }

  async function revoke(id: number) {
    await api.revokeHoliday(id)
    await loadHolidays()
  }

  async function remove(id: number) {
    if (!confirm('Delete this holiday?')) return
    await api.deleteHoliday(id)
    await loadHolidays()
  }

  $: approved = holidays.filter(h => h.isApproved)
  $: pending = holidays.filter(h => !h.isApproved && new Date(h.date) >= new Date(new Date().toDateString()))

  $: upcoming = holidays.filter(h => new Date(h.date) >= new Date())
  $: past = holidays.filter(h => new Date(h.date) < new Date())

  function monthName(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', { month: 'long' })
  }
</script>

<svelte:head><title>Holidays · Coadal Attendance</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Holidays</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
        {#if $isAdmin}Only approved holidays are visible to employees
        {:else}{currentYear} mein {holidays.length} holidays hain
        {/if}
      </p>
    </div>
    <div class="flex items-center gap-3">
      <select bind:value={currentYear} on:change={loadHolidays} class="input py-1.5 text-sm w-28">
        {#each [currentYear - 1, currentYear, currentYear + 1] as y}
          <option value={y}>{y}</option>
        {/each}
      </select>
      {#if $isAdmin}
        <button on:click={() => showAdd = true} class="btn-primary">
          <Plus size={16} /> Add Holiday
        </button>
      {/if}
    </div>
  </div>

  {#if loading}
    <div class="space-y-3">
      {#each Array(5) as _}
        <div class="card animate-pulse h-16"></div>
      {/each}
    </div>

  {:else if $isAdmin}
    <!-- ═══════════ ADMIN VIEW ═══════════ -->

    {#if pending.length > 0}
      <div class="card overflow-hidden p-0">
        <div class="px-6 py-4 border-b border-amber-500/20 bg-amber-500/10 flex items-center gap-2">
          <EyeOff size={16} class="text-amber-600 dark:text-amber-400" />
          <h2 class="font-semibold text-amber-700 dark:text-amber-300">Pending Approval ({pending.length})</h2>
          <span class="text-xs text-amber-600 dark:text-amber-400 ml-1">— not visible to employees yet</span>
        </div>
        <div class="divide-y divide-[var(--color-divide)]">
          {#each pending as h}
            <div class="flex items-center justify-between px-6 py-4 hover:bg-[var(--color-faint)] transition-colors">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-amber-500/15 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                  <span class="text-xs font-semibold text-amber-600 dark:text-amber-400">{monthName(h.date).slice(0,3).toUpperCase()}</span>
                  <span class="text-lg font-bold text-amber-700 dark:text-amber-300 leading-none">{new Date(h.date).getDate()}</span>
                </div>
                <div>
                  <p class="font-medium text-gray-900 dark:text-gray-100">{h.name}</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500">{formatDate(h.date)}{h.isOptional ? ' · Optional' : ''}</p>
                  {#if h.description}<p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{h.description}</p>{/if}
                </div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <button on:click={() => approve(h.id)}
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 rounded-lg transition-colors">
                  <Check size={13} /> Approve
                </button>
                <button on:click={() => remove(h.id)}
                  class="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/15 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="card overflow-hidden p-0">
      <div class="px-6 py-4 border-b border-emerald-500/20 bg-emerald-500/10 flex items-center gap-2">
        <CalendarDays size={16} class="text-emerald-600 dark:text-emerald-400" />
        <h2 class="font-semibold text-emerald-700 dark:text-emerald-300">Approved Holidays ({approved.length})</h2>
        <span class="text-xs text-emerald-600 dark:text-emerald-400 ml-1">— visible to all employees</span>
      </div>
      {#if approved.length === 0}
        <p class="px-6 py-10 text-center text-sm text-gray-400 dark:text-gray-500">No approved holidays for {currentYear}</p>
      {:else}
        <div class="divide-y divide-[var(--color-divide)]">
          {#each approved as h}
            <div class="flex items-center justify-between px-6 py-4 hover:bg-[var(--color-faint)] transition-colors">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-emerald-500/15 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                  <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{monthName(h.date).slice(0,3).toUpperCase()}</span>
                  <span class="text-lg font-bold text-emerald-700 dark:text-emerald-300 leading-none">{new Date(h.date).getDate()}</span>
                </div>
                <div>
                  <p class="font-medium text-gray-900 dark:text-gray-100">{h.name}</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500">{formatDate(h.date)}{h.isOptional ? ' · Optional' : ''}</p>
                  {#if h.description}<p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{h.description}</p>{/if}
                </div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <span class="badge badge-green text-xs">Approved</span>
                <button on:click={() => revoke(h.id)}
                  class="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 rounded-lg transition-colors" title="Revoke approval">
                  <EyeOff size={14} />
                </button>
                <button on:click={() => remove(h.id)}
                  class="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/15 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  {:else}
    <!-- ═══════════ EMPLOYEE VIEW ═══════════ -->

    {#if holidays.length === 0}
      <div class="card py-16 text-center">
        <CalendarDays size={36} class="mx-auto text-gray-400 dark:text-gray-600 mb-3" />
        <p class="text-gray-400 dark:text-gray-500">{currentYear} ke liye koi holiday approved nahi hai abhi</p>
      </div>
    {:else}
      <!-- Upcoming -->
      {#if upcoming.length > 0}
        <div class="card overflow-hidden p-0">
          <div class="px-6 py-4 border-b border-brand-500/20 bg-brand-500/10 flex items-center gap-2">
            <CalendarDays size={16} class="text-brand-600 dark:text-brand-400" />
            <h2 class="font-semibold text-brand-700 dark:text-brand-300">Upcoming Holidays ({upcoming.length})</h2>
          </div>
          <div class="divide-y divide-[var(--color-divide)]">
            {#each upcoming as h}
              <div class="flex items-center justify-between px-6 py-4 hover:bg-[var(--color-faint)] transition-colors">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 bg-brand-500/15 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                    <span class="text-xs font-semibold text-brand-600 dark:text-brand-400">{monthName(h.date).slice(0,3).toUpperCase()}</span>
                    <span class="text-lg font-bold text-brand-700 dark:text-brand-300 leading-none">{new Date(h.date).getDate()}</span>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900 dark:text-gray-100">{h.name}</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500">{formatDate(h.date)}</p>
                    {#if h.description}<p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{h.description}</p>{/if}
                  </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  {#if !h.isApproved}
                    <span class="badge badge-yellow text-xs">Pending</span>
                  {:else if h.isOptional}
                    <span class="badge badge-yellow text-xs">Optional</span>
                  {:else}
                    <span class="badge badge-green text-xs">Approved</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Past -->
      {#if past.length > 0}
        <div class="card overflow-hidden p-0">
          <div class="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-faint)] flex items-center gap-2">
            <CalendarDays size={16} class="text-gray-400 dark:text-gray-500" />
            <h2 class="font-semibold text-gray-500 dark:text-gray-400">Past Holidays ({past.length})</h2>
          </div>
          <div class="divide-y divide-[var(--color-divide)]">
            {#each past as h}
              <div class="flex items-center justify-between px-6 py-4 hover:bg-[var(--color-faint)] transition-colors opacity-50">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 bg-[var(--color-subtle)] rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                    <span class="text-xs font-semibold text-gray-400 dark:text-gray-500">{monthName(h.date).slice(0,3).toUpperCase()}</span>
                    <span class="text-lg font-bold text-gray-500 dark:text-gray-400 leading-none">{new Date(h.date).getDate()}</span>
                  </div>
                  <div>
                    <p class="font-medium text-gray-600 dark:text-gray-300">{h.name}</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500">{formatDate(h.date)}</p>
                    {#if h.description}<p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{h.description}</p>{/if}
                  </div>
                </div>
                <div class="flex items-center gap-1.5">
                  {#if !h.isApproved}
                    <span class="badge badge-yellow text-xs opacity-70">Pending</span>
                  {:else if h.isOptional}
                    <span class="badge badge-gray text-xs">Optional</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  {/if}
</div>

<!-- Add Holiday Modal (admin only) -->
{#if showAdd}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div class="bg-modal border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md">
      <div class="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Holiday</h2>
        <button on:click={() => { showAdd = false; formError = '' }} class="p-2 hover:bg-[var(--color-subtle)] rounded-lg text-gray-500 dark:text-gray-400">
          <X size={18} />
        </button>
      </div>
      <form on:submit|preventDefault={addHoliday} class="p-6 space-y-4">
        <div>
          <label for="h-date" class="label">Date *</label>
          <input id="h-date" type="date" bind:value={form.date} class="input" required />
        </div>
        <div>
          <label for="h-name" class="label">Holiday Name *</label>
          <input id="h-name" type="text" bind:value={form.name} class="input" placeholder="e.g. Diwali" required />
        </div>
        <div>
          <label for="h-desc" class="label">Description</label>
          <input id="h-desc" type="text" bind:value={form.description} class="input" placeholder="Optional" />
        </div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" bind:checked={form.isOptional} class="w-4 h-4 rounded accent-brand-600" />
          <span class="text-sm text-gray-700 dark:text-gray-300">Optional holiday</span>
        </label>
        <p class="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg">
          Holiday will be saved as <strong>pending</strong> — approve it to make it visible to employees.
        </p>
        {#if formError}
          <p class="text-xs text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{formError}</p>
        {/if}
        <div class="flex gap-3 pt-1">
          <button type="button" on:click={() => { showAdd = false; formError = '' }} class="btn-secondary flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={saving} class="btn-primary flex-1 justify-center">
            {saving ? 'Saving...' : 'Add Holiday'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
