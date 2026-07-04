<script lang="ts">
  import { X, Download } from 'lucide-svelte'

  export let title = 'Export CSV'
  export let loading = false
  export let onConfirm: (startDate: string, endDate: string) => void
  export let onClose: () => void = () => {}

  const today = new Date().toISOString().split('T')[0]
  const defaultStart = (() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().split('T')[0]
  })()

  let startDate = defaultStart
  let endDate = today
  let error = ''

  function confirm() {
    if (!startDate || !endDate) { error = 'Please select both dates'; return }
    if (startDate > endDate) { error = 'From date must be before To date'; return }
    error = ''
    onConfirm(startDate, endDate)
  }
</script>

<div class="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
  on:click|self={onClose} role="dialog" aria-modal="true">
  <div class="bg-modal border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-sm">
    <div class="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      <button on:click={onClose} class="p-1.5 hover:bg-[var(--color-subtle)] rounded-lg text-gray-500 dark:text-gray-400">
        <X size={17} />
      </button>
    </div>
    <div class="p-5 space-y-4">
      <div>
        <label class="label" for="drm-from">From Date</label>
        <input id="drm-from" type="date" bind:value={startDate} max={today} class="input" />
      </div>
      <div>
        <label class="label" for="drm-to">To Date</label>
        <input id="drm-to" type="date" bind:value={endDate} max={today} class="input" />
      </div>
      {#if error}
        <p class="text-sm text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
      {/if}
      <div class="flex gap-3 pt-1">
        <button on:click={onClose} class="btn-secondary flex-1 justify-center">Cancel</button>
        <button on:click={confirm} disabled={loading} class="btn-primary flex-1 justify-center">
          <Download size={14} /> {loading ? 'Exporting...' : 'Export'}
        </button>
      </div>
    </div>
  </div>
</div>
