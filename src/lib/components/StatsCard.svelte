<script lang="ts">
  export let label: string
  export let value: string | number
  export let sub: string = ''
  export let color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' = 'blue'
  export let icon: any
  export let trend: string = ''

  const colorMap = {
    blue: { bg: 'bg-brand-50', icon: 'bg-brand-100 text-brand-700', text: 'text-brand-900' },
    green: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-900' },
    red: { bg: 'bg-red-50', icon: 'bg-red-100 text-red-700', text: 'text-red-900' },
    yellow: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-700', text: 'text-amber-900' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-700', text: 'text-purple-900' },
  }

  $: c = colorMap[color]
</script>

<div class="card flex items-start gap-4 hover:shadow-md transition-shadow">
  <div class="w-12 h-12 rounded-xl {c.icon} flex items-center justify-center flex-shrink-0">
    <svelte:component this={icon} size={22} />
  </div>
  <div class="flex-1 min-w-0">
    <p class="text-sm text-gray-500 font-medium">{label}</p>
    <p class="text-2xl font-bold {c.text} mt-0.5">{value}</p>
    {#if sub}
      <p class="text-xs text-gray-400 mt-0.5">{sub}</p>
    {/if}
    {#if trend}
      <p class="text-xs text-gray-500 mt-1">{trend}</p>
    {/if}
  </div>
</div>
