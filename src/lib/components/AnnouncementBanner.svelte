<script lang="ts">
  import { afterNavigate } from '$app/navigation'
  import { page } from '$app/stores'
  import { get } from 'svelte/store'
  import { isAdmin, user } from '$lib/stores/auth'
  import { api } from '$lib/api'
  import { Megaphone, X } from 'lucide-svelte'

  let activeAnnouncements: any[] = []
  let dismissedIds: number[] = []

  $: visibleAnnouncements = activeAnnouncements.filter(a => !dismissedIds.includes(a.id))

  // Scoped per logged-in account so dismissals don't leak across users sharing a browser.
  function storageKey(): string | null {
    const u = get(user)
    if (!u || typeof localStorage === 'undefined') return null
    return `dismissedAnnouncementIds_${u.id}`
  }

  function saveDismissedIds() {
    const key = storageKey()
    if (key) localStorage.setItem(key, JSON.stringify(dismissedIds))
  }

  // Only hides the announcement for this account in this browser — everyone else still sees it.
  // Deleting it for good is only possible from the Announcements page.
  function dismissAnnouncement(id: number) {
    dismissedIds = [...dismissedIds, id]
    saveDismissedIds()
  }

  async function refresh() {
    const key = storageKey()
    if (key) {
      try { dismissedIds = JSON.parse(localStorage.getItem(key) || '[]') }
      catch { dismissedIds = [] }
    } else {
      dismissedIds = []
    }
    try { activeAnnouncements = await api.getActiveAnnouncements() }
    catch { activeAnnouncements = [] }
    const activeIds = activeAnnouncements.map(a => a.id)
    dismissedIds = dismissedIds.filter(id => activeIds.includes(id))
    saveDismissedIds()
  }

  // afterNavigate is client-only — fires once on mount and again on every
  // subsequent navigation, but (unlike a top-level reactive statement) never
  // runs during SSR, so this never hits the API unauthenticated on the server.
  afterNavigate(refresh)
</script>

{#if visibleAnnouncements.length > 0 && $page.url.pathname !== '/announcements'}
  <div class="space-y-2 mb-6">
    {#each visibleAnnouncements as a (a.id)}
      <div class="card flex items-start gap-3 border-l-4 border-l-brand-500 py-3">
        <Megaphone size={16} class="text-brand-600 dark:text-brand-400 mt-0.5 flex-shrink-0" />
        <div class="min-w-0 flex-1">
          <p class="font-medium text-sm text-gray-900 dark:text-gray-100">{a.title}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5 whitespace-pre-wrap">{a.message}</p>
        </div>
        {#if $isAdmin}
          <button on:click={() => dismissAnnouncement(a.id)}
            title="Hide for me only — delete it from the Announcements page to remove it for everyone"
            class="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0">
            <X size={15} />
          </button>
        {/if}
      </div>
    {/each}
  </div>
{/if}
