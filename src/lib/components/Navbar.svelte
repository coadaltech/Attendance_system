<script lang="ts">
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { authStore, user, isAdmin } from '$lib/stores/auth'
  import { Menu, X, LayoutDashboard, Clock, Calendar, Users, LogOut, ChevronDown, Building2, CalendarDays } from 'lucide-svelte'

  let mobileOpen = false

  $: navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...($isAdmin ? [] : [{ href: '/attendance', label: 'Attendance', icon: Clock }]),
    { href: '/leave', label: 'Leave', icon: Calendar },
  ]

  const adminItems = [
    { href: '/employees', label: 'Employees', icon: Users },
    { href: '/holidays', label: 'Holidays', icon: CalendarDays },
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
            <div class="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {$user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span class="hidden sm:block font-medium text-gray-700">{$user?.name?.split(' ')[0]}</span>
            <ChevronDown size={14} class="text-gray-500 {userMenuOpen ? 'rotate-180' : ''} transition-transform" />
          </button>

          {#if userMenuOpen}
            <div class="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50"
              role="menu" tabindex="-1" on:mouseleave={() => userMenuOpen = false}>
              <div class="px-4 py-3 border-b border-gray-100">
                <p class="text-sm font-semibold text-gray-900">{$user?.name}</p>
                <p class="text-xs text-gray-500">{$user?.employeeCode} · {$user?.role}</p>
              </div>
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
