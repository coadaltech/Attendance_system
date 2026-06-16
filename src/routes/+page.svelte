<script lang="ts">
  import { goto } from '$app/navigation'
  import { authStore } from '$lib/stores/auth'
  import { api } from '$lib/api'
  import { Building2, Eye, EyeOff } from 'lucide-svelte'

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

<div class="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 flex items-center justify-center p-4">
  <!-- Background pattern -->
  <div class="absolute inset-0 overflow-hidden opacity-10">
    <div class="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white"></div>
    <div class="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-white"></div>
  </div>

  <div class="relative w-full max-w-md">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
        <Building2 size={32} class="text-brand-700" />
      </div>
      <h1 class="text-3xl font-bold text-white">Coadal Technology</h1>
      <p class="text-brand-200 mt-1">Attendance Management System</p>
    </div>

    <!-- Card -->
    <div class="bg-white rounded-2xl shadow-2xl p-8">
      <h2 class="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>

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
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {#if showPassword}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
            </button>
          </div>
        </div>

        {#if error}
          <div class="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        {/if}

        <button type="submit" disabled={loading} class="btn-primary w-full justify-center py-3 text-base mt-2">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  </div>
</div>
