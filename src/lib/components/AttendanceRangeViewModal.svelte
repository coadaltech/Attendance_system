<script lang="ts">
  import { X, Download } from 'lucide-svelte'
  import { downloadCSV } from '$lib/utils'

  export let title = 'Attendance'
  export let subtitle = ''
  export let header: string[] = []
  export let rows: string[][] = []
  export let filename = 'attendance.csv'
  export let onClose: () => void = () => {}
</script>

<div class="fixed inset-0 bg-black/70 flex items-start justify-center z-[60] p-4 overflow-y-auto"
  on:click|self={onClose} role="dialog" aria-modal="true">
  <div class="bg-modal border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-5xl my-6">
    <div class="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
      <div>
        <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        {#if subtitle}
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <button on:click={() => downloadCSV(filename, [header, ...rows])}
          class="btn-secondary py-1.5 px-3 text-sm flex items-center gap-1.5">
          <Download size={14} /> Download
        </button>
        <button on:click={onClose} class="p-1.5 hover:bg-[var(--color-subtle)] rounded-lg text-gray-500 dark:text-gray-400">
          <X size={17} />
        </button>
      </div>
    </div>
    <div class="p-0 overflow-x-auto max-h-[70vh] overflow-y-auto">
      <table class="w-full">
        <thead class="bg-[var(--color-faint)] sticky top-0">
          <tr>
            {#each header as h}
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
            {/each}
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--color-divide)]">
          {#each rows as row}
            <tr class="hover:bg-[var(--color-faint)] transition-colors">
              {#each row as cell}
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{cell}</td>
              {/each}
            </tr>
          {:else}
            <tr>
              <td colspan={header.length} class="px-4 py-10 text-center text-gray-400 dark:text-gray-500 text-sm">
                No attendance records for this period
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>
