<script lang="ts">
  import '../app.css'
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { authStore, isLoggedIn } from '$lib/stores/auth'
  import { themeStore } from '$lib/stores/theme'
  import Navbar from '$lib/components/Navbar.svelte'
  import AnnouncementBanner from '$lib/components/AnnouncementBanner.svelte'

  // Initialize auth synchronously so $isAdmin is ready before any page onMount runs.
  // Child onMount runs before parent onMount in Svelte, so putting init() here
  // (module scope) ensures auth state is populated before dashboard reads $isAdmin.
  if (browser) authStore.init()

  onMount(() => {
    themeStore.init()
    if (!$isLoggedIn && $page.url.pathname !== '/') {
      goto('/')
    }
  })

  $: isLoginPage = $page.url.pathname === '/'
</script>

{#if isLoginPage}
  <slot />
{:else}
  <div class="min-h-screen bg-page">
    <Navbar />
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <AnnouncementBanner />
      <slot />
    </main>
  </div>
{/if}
