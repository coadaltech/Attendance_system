<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { isAdmin } from '$lib/stores/auth'
  import { api } from '$lib/api'
  import { Plus, X, Trash2, Megaphone } from 'lucide-svelte'

  let announcements: any[] = []
  let loading = true
  let showAdd = false
  let saving = false
  let formError = ''

  let form = { title: '', message: '', durationDays: 7 }

  onMount(async () => {
    if (!$isAdmin) { goto('/dashboard'); return }
    await loadAnnouncements()
  })

  async function loadAnnouncements() {
    loading = true
    try { announcements = await api.getAllAnnouncements() }
    finally { loading = false }
  }

  async function addAnnouncement() {
    if (!form.title || !form.message) { formError = 'Title and message are required'; return }
    if (!form.durationDays || form.durationDays < 1) { formError = 'Duration must be at least 1 day'; return }
    try {
      saving = true; formError = ''
      await api.createAnnouncement(form)
      showAdd = false
      form = { title: '', message: '', durationDays: 7 }
      await loadAnnouncements()
    } catch (e: any) {
      formError = e.message
    } finally { saving = false }
  }

  async function remove(id: number) {
    if (!confirm('Delete this announcement?')) return
    await api.deleteAnnouncement(id)
    await loadAnnouncements()
  }

  function daysLeft(expiresAt: string): number {
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000))
  }

  $: active = announcements.filter(a => new Date(a.expiresAt).getTime() > Date.now())
  $: expired = announcements.filter(a => new Date(a.expiresAt).getTime() <= Date.now())
</script>

<svelte:head><title>Announcements · Coadal Attendance</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Announcements</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Visible on every dashboard until they expire</p>
    </div>
    <button on:click={() => showAdd = true} class="btn-primary">
      <Plus size={16} /> New Announcement
    </button>
  </div>

  {#if loading}
    <div class="space-y-3">
      {#each Array(3) as _}
        <div class="card animate-pulse h-20"></div>
      {/each}
    </div>
  {:else}
    <div class="card overflow-hidden p-0">
      <div class="px-6 py-4 border-b border-emerald-500/20 bg-emerald-500/10 flex items-center gap-2">
        <Megaphone size={16} class="text-emerald-600 dark:text-emerald-400" />
        <h2 class="font-semibold text-emerald-700 dark:text-emerald-300">Active ({active.length})</h2>
      </div>
      {#if active.length === 0}
        <p class="px-6 py-10 text-center text-sm text-gray-400 dark:text-gray-500">No active announcements</p>
      {:else}
        <div class="divide-y divide-[var(--color-divide)]">
          {#each active as a}
            <div class="flex items-start justify-between gap-4 px-6 py-4 hover:bg-[var(--color-faint)] transition-colors">
              <div class="min-w-0">
                <p class="font-medium text-gray-900 dark:text-gray-100">{a.title}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5 whitespace-pre-wrap">{a.message}</p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                  Posted by {a.createdByName} · {daysLeft(a.expiresAt)} day{daysLeft(a.expiresAt) !== 1 ? 's' : ''} left
                </p>
              </div>
              <button on:click={() => remove(a.id)}
                class="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/15 rounded-lg transition-colors flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    {#if expired.length > 0}
      <div class="card overflow-hidden p-0">
        <div class="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-faint)] flex items-center gap-2">
          <Megaphone size={16} class="text-gray-400 dark:text-gray-500" />
          <h2 class="font-semibold text-gray-500 dark:text-gray-400">Expired ({expired.length})</h2>
        </div>
        <div class="divide-y divide-[var(--color-divide)]">
          {#each expired as a}
            <div class="flex items-start justify-between gap-4 px-6 py-4 hover:bg-[var(--color-faint)] transition-colors opacity-50">
              <div class="min-w-0">
                <p class="font-medium text-gray-600 dark:text-gray-300">{a.title}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5 whitespace-pre-wrap">{a.message}</p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1.5">Posted by {a.createdByName}</p>
              </div>
              <button on:click={() => remove(a.id)}
                class="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/15 rounded-lg transition-colors flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- New Announcement Modal -->
{#if showAdd}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div class="bg-modal border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md">
      <div class="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">New Announcement</h2>
        <button on:click={() => { showAdd = false; formError = '' }} class="p-2 hover:bg-[var(--color-subtle)] rounded-lg text-gray-500 dark:text-gray-400">
          <X size={18} />
        </button>
      </div>
      <form on:submit|preventDefault={addAnnouncement} class="p-6 space-y-4">
        <div>
          <label for="a-title" class="label">Title *</label>
          <input id="a-title" type="text" bind:value={form.title} class="input" placeholder="e.g. Office closed Friday" required />
        </div>
        <div>
          <label for="a-message" class="label">Message *</label>
          <textarea id="a-message" bind:value={form.message} class="input" rows="3" placeholder="Details for employees" required></textarea>
        </div>
        <div>
          <label for="a-duration" class="label">Show for (days) *</label>
          <input id="a-duration" type="number" min="1" max="365" bind:value={form.durationDays} class="input" required />
        </div>
        {#if formError}
          <p class="text-xs text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{formError}</p>
        {/if}
        <div class="flex gap-3 pt-1">
          <button type="button" on:click={() => { showAdd = false; formError = '' }} class="btn-secondary flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={saving} class="btn-primary flex-1 justify-center">
            {saving ? 'Posting...' : 'Post Announcement'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
