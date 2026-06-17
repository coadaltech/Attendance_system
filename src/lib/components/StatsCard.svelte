<script lang="ts">
  export let label: string
  export let value: string | number
  export let sub: string = ''
  export let color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' = 'blue'
  export let icon: any
  export let trend: string = ''

  const colorMap = {
    blue:   { bg: 'bg-brand-500/10',   icon: 'bg-brand-500/20 text-brand-600 dark:text-brand-400',     text: 'text-brand-700 dark:text-brand-300' },
    green:  { bg: 'bg-emerald-500/10', icon: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400', text: 'text-emerald-700 dark:text-emerald-300' },
    red:    { bg: 'bg-red-500/10',     icon: 'bg-red-500/20 text-red-600 dark:text-red-400',             text: 'text-red-700 dark:text-red-300' },
    yellow: { bg: 'bg-amber-500/10',   icon: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',       text: 'text-amber-700 dark:text-amber-300' },
    purple: { bg: 'bg-purple-500/10',  icon: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',    text: 'text-purple-700 dark:text-purple-300' },
  }

  $: c = colorMap[color]
</script>

<div class="rounded-xl shadow-sm hover:shadow-md transition-shadow p-3 sm:p-5 flex items-start gap-2.5 sm:gap-4"
  style="background-color: var(--color-card); border: 1px solid var(--color-border);">
  <div class="w-9 h-9 sm:w-12 sm:h-12 rounded-xl {c.icon} flex items-center justify-center flex-shrink-0">
    <svelte:component this={icon} size={20} />
  </div>
  <div class="flex-1 min-w-0">
    <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium leading-tight">{label}</p>
    <p class="text-xl sm:text-2xl font-bold {c.text} mt-0.5">{value}</p>
    {#if sub}
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
    {/if}
    {#if trend}
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">{trend}</p>
    {/if}
  </div>
</div>
