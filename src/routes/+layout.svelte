<script lang="ts">
  import '../app.css'
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { authStore, isLoggedIn } from '$lib/stores/auth'
  import { themeStore } from '$lib/stores/theme'
  import Navbar from '$lib/components/Navbar.svelte'

  onMount(() => {
    themeStore.init()
    authStore.init()
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
      <slot />
    </main>
  </div>
{/if}
