<script lang="ts">
  import { goto } from '$app/navigation'
  import { authStore } from '$lib/stores/auth'
  import { api } from '$lib/api'
  import { Eye, EyeOff } from 'lucide-svelte'

  let email = ''
  let password = ''
  let loading = false
  let error = ''
  let showPassword = false

  async function login() {
    if (!email || !password) { error = 'Please enter email and password'; return }
    try {
      loading = true; error = ''
      const { token, employee } = await api.login(email, password)
      authStore.login(token, employee)
      goto('/dashboard')
    } catch (e: any) {
      error = e.message || 'Login failed'
    } finally {
      loading = false
    }
  }
</script>


<div class="min-h-screen bg-page flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <!-- Logo -->
    <div class="text-center mb-8">
      <img src="/logo.png" alt="Coadal" class="h-20 w-auto mx-auto" style="mix-blend-mode:screen" />
      <p class="text-gray-500 dark:text-white/40 mt-3 text-sm tracking-widest uppercase">Attendance Management</p>
    </div>

    <!-- Card -->
    <div class="bg-card border border-[var(--color-border)] rounded-2xl shadow-2xl p-8">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Sign in to your account</h2>

      <form on:submit|preventDefault={login} class="space-y-4">
        <div>
          <label for="email" class="label">Email address</label>
          <input id="email" type="email" bind:value={email} placeholder="you@coadal.com"
            class="input" required autocomplete="email" />
        </div>

        <div>
          <label for="password" class="label">Password</label>
          <div class="relative">
            <input id="password" type={showPassword ? 'text' : 'password'} bind:value={password}
              placeholder="Enter your password" class="input pr-10" required autocomplete="current-password" />
            <button type="button" on:click={() => showPassword = !showPassword}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
              {#if showPassword}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
            </button>
          </div>
        </div>

        {#if error}
          <div class="bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
        {/if}

        <button type="submit" disabled={loading} class="btn-primary w-full justify-center py-3 text-base mt-2">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  </div>
</div>

