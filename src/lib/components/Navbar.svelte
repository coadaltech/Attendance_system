<script lang="ts">
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { authStore, user, isAdmin } from '$lib/stores/auth'
  import { Menu, X, LayoutDashboard, Clock, Calendar, Users, LogOut, ChevronDown, Building2, CalendarDays, Camera, Lock, Eye, EyeOff } from 'lucide-svelte'
  import AvatarUpload from '$lib/components/AvatarUpload.svelte'
  import { api } from '$lib/api'

  let mobileOpen = false

  let showPassModal = false
  let passForm = { old: '', new_: '', confirm: '' }
  let passSaving = false
  let passError = ''
  let passSuccess = false
  let passShowOld = false
  let passShowNew = false

  function openPassModal() {
    passForm = { old: '', new_: '', confirm: '' }
    passError = ''; passSuccess = false
    passShowOld = false; passShowNew = false
    userMenuOpen = false; showPassModal = true
  }

  async function changePassword() {
    if (!passForm.old || !passForm.new_ || !passForm.confirm) { passError = 'Saare fields bharo'; return }
    if (passForm.new_.length < 8) { passError = 'New password kam se kam 8 characters ka hona chahiye'; return }
    if (passForm.new_ !== passForm.confirm) { passError = 'New password aur confirm password match nahi kar rahe'; return }
    try {
      passSaving = true; passError = ''
      await api.changePassword($user!.id, passForm.old, passForm.new_)
      passSuccess = true
      setTimeout(() => { showPassModal = false; passSuccess = false }, 1800)
    } catch (e: any) {
      passError = e.message
    } finally { passSaving = false }
  }

  $: navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...($isAdmin ? [] : [{ href: '/attendance', label: 'Attendance', icon: Clock }]),
    { href: '/leave', label: 'Leave', icon: Calendar },
    { href: '/holidays', label: 'Holidays', icon: CalendarDays },
  ]

  const adminItems = [
    { href: '/employees', label: 'Employees', icon: Users },
  ]

  function logout() {
    authStore.logout()
    goto('/')
  }

  $: current = $page.url.pathname
  $: userMenuOpen = false
</script>

<nav class="bg-white border-b border-gray-200 sticky top-0 z-40">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      <a href="/dashboard" class="flex items-center gap-2.5 text-brand-700 font-bold text-lg">
        <div class="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
          <Building2 size={18} class="text-white" />
        </div>
        <span class="hidden sm:block">Coadal</span>
        <span class="hidden sm:block text-gray-400 font-normal text-sm">Attendance</span>
      </a>

      <!-- Desktop nav -->
      <div class="hidden md:flex items-center gap-1">
        {#each navItems as item}
          <a href={item.href}
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              {current.startsWith(item.href) ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}">
            <svelte:component this={item.icon} size={16} />
            {item.label}
          </a>
        {/each}
        {#if $isAdmin}
          {#each adminItems as item}
            <a href={item.href}
              class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                {current.startsWith(item.href) ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}">
              <svelte:component this={item.icon} size={16} />
              {item.label}
            </a>
          {/each}
        {/if}
      </div>

      <!-- User menu -->
      <div class="flex items-center gap-3">
        <div class="relative">
          <button on:click={() => userMenuOpen = !userMenuOpen}
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-sm">
            {#if $user?.avatar}
              <img src={$user.avatar} alt={$user.name} class="w-7 h-7 rounded-full object-cover" />
            {:else}
              <div class="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {$user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            {/if}
            <span class="hidden sm:block font-medium text-gray-700">{$user?.name?.split(' ')[0]}</span>
            <ChevronDown size={14} class="text-gray-500 {userMenuOpen ? 'rotate-180' : ''} transition-transform" />
          </button>

          {#if userMenuOpen}
            <div class="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50"
              role="menu" tabindex="-1" on:mouseleave={() => userMenuOpen = false}>
              <div class="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                {#if $user}
                  <AvatarUpload
                    employeeId={$user.id}
                    name={$user.name}
                    avatar={$user.avatar}
                    size="md"
                    on:change={e => authStore.updateUser({ avatar: e.detail })}
                  />
                {/if}
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-gray-900 truncate">{$user?.name}</p>
                  <p class="text-xs text-gray-500">{$user?.employeeCode} · {$user?.role}</p>
                  <p class="text-xs text-brand-600 mt-0.5">Click photo to change</p>
                </div>
              </div>
              <button on:click={openPassModal}
                class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <Lock size={14} />
                Change Password
              </button>
              <button on:click={logout}
                class="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          {/if}
        </div>

        <!-- Mobile hamburger -->
        <button class="md:hidden p-2 rounded-lg hover:bg-gray-100" on:click={() => mobileOpen = !mobileOpen}>
          {#if mobileOpen}<X size={20} />{:else}<Menu size={20} />{/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Mobile menu -->
  {#if mobileOpen}
    <div class="md:hidden border-t border-gray-200 px-4 py-3 space-y-1">
      {#each [...navItems, ...($isAdmin ? adminItems : [])] as item}
        <a href={item.href} on:click={() => mobileOpen = false}
          class="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
            {current.startsWith(item.href) ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'}">
          <svelte:component this={item.icon} size={16} />
          {item.label}
        </a>
      {/each}
      <button on:click={logout}
        class="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">
        <LogOut size={16} />
        Sign out
      </button>
    </div>
  {/if}
</nav>

<!-- Change Password Modal -->
{#if showPassModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
      <div class="flex items-center justify-between p-5 border-b border-gray-100">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 bg-brand-50 rounded-full flex items-center justify-center">
            <Lock size={15} class="text-brand-600" />
          </div>
          <h2 class="text-base font-semibold text-gray-900">Change Password</h2>
        </div>
        <button on:click={() => showPassModal = false} class="p-1.5 hover:bg-gray-100 rounded-lg"><X size={17} /></button>
      </div>

      {#if passSuccess}
        <div class="p-8 text-center">
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          </div>
          <p class="font-semibold text-gray-900">Password changed!</p>
        </div>
      {:else}
        <form on:submit|preventDefault={changePassword} class="p-5 space-y-4">
          <div>
            <label class="label" for="cp-old">Current Password</label>
            <div class="relative">
              <input id="cp-old" type={passShowOld ? 'text' : 'password'}
                bind:value={passForm.old} class="input pr-10" placeholder="Current password" required />
              <button type="button" on:click={() => passShowOld = !passShowOld}
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {#if passShowOld}<EyeOff size={15} />{:else}<Eye size={15} />{/if}
              </button>
            </div>
          </div>
          <div>
            <label class="label" for="cp-new">New Password</label>
            <div class="relative">
              <input id="cp-new" type={passShowNew ? 'text' : 'password'}
                bind:value={passForm.new_} class="input pr-10" placeholder="Min 8 characters" required />
              <button type="button" on:click={() => passShowNew = !passShowNew}
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {#if passShowNew}<EyeOff size={15} />{:else}<Eye size={15} />{/if}
              </button>
            </div>
          </div>
          <div>
            <label class="label" for="cp-confirm">Confirm New Password</label>
            <input id="cp-confirm" type="password"
              bind:value={passForm.confirm} class="input" placeholder="Repeat new password" required />
          </div>
          {#if passError}
            <p class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{passError}</p>
          {/if}
          <div class="flex gap-3 pt-1">
            <button type="button" on:click={() => showPassModal = false} class="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={passSaving} class="btn-primary flex-1 justify-center">
              {passSaving ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}
