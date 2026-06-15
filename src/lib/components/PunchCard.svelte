<script lang="ts">
  import { onMount } from 'svelte'
  import { LogIn, LogOut, Timer, MapPin, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-svelte'
  import { api } from '$lib/api'
  import { formatTime, formatHours } from '$lib/utils'

  export let todayRecord: any = null
  export let onUpdate: (record: any) => void = () => {}

  let loading = false
  let locating = false
  let error = ''
  let now = new Date()

  // Geolocation state
  let locationStatus: 'idle' | 'locating' | 'ok' | 'far' | 'denied' | 'unavailable' = 'idle'
  let currentCoords: { lat: number; lng: number } | null = null
  let distanceFromOffice: number | null = null
  let officeConfig: { lat: number; lng: number; radius: number; name: string } | null = null

  setInterval(() => now = new Date(), 1000)

  onMount(async () => {
    try {
      officeConfig = await api.getOfficeConfig()
    } catch {}
  })

  $: isPunchedIn = !!todayRecord?.punchIn
  $: isPunchedOut = !!todayRecord?.punchOut

  $: liveHours = (() => {
    if (!isPunchedIn || isPunchedOut) return null
    const diff = (now.getTime() - new Date(todayRecord.punchIn).getTime()) / 3600000
    return diff.toFixed(2)
  })()

  // Haversine on the client too — for live distance display
  function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000
    const toRad = (d: number) => d * Math.PI / 180
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
  }

  async function getLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          if (err.code === err.PERMISSION_DENIED) reject(new Error('location_denied'))
          else reject(new Error('location_unavailable'))
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    })
  }

  async function checkLocation() {
    locationStatus = 'locating'
    error = ''
    try {
      const coords = await getLocation()
      currentCoords = coords
      if (officeConfig && officeConfig.lat && officeConfig.lng) {
        const dist = calcDistance(coords.lat, coords.lng, officeConfig.lat, officeConfig.lng)
        distanceFromOffice = dist
        locationStatus = dist <= officeConfig.radius ? 'ok' : 'far'
      } else {
        locationStatus = 'ok'
      }
    } catch (e: any) {
      currentCoords = null
      distanceFromOffice = null
      if (e.message === 'location_denied') {
        locationStatus = 'denied'
        error = 'Location access denied. Please allow location in your browser settings.'
      } else {
        locationStatus = 'unavailable'
        error = 'Unable to get your location. Please check your GPS.'
      }
    }
  }

  async function punchIn() {
    error = ''
    // Step 1: Get location
    locating = true
    let coords: { lat: number; lng: number }
    try {
      coords = await getLocation()
      currentCoords = coords
      if (officeConfig && officeConfig.lat && officeConfig.lng) {
        distanceFromOffice = calcDistance(coords.lat, coords.lng, officeConfig.lat, officeConfig.lng)
        locationStatus = distanceFromOffice <= officeConfig.radius ? 'ok' : 'far'
      } else {
        locationStatus = 'ok'
      }
    } catch (e: any) {
      locating = false
      locationStatus = e.message === 'location_denied' ? 'denied' : 'unavailable'
      error = e.message === 'location_denied'
        ? 'Location access denied. Please allow location permission and try again.'
        : 'Unable to get your location. Please check your device GPS.'
      return
    } finally {
      locating = false
    }

    // Step 2: Send to backend (backend also validates distance)
    try {
      loading = true
      const record = await api.punchIn(coords.lat, coords.lng)
      onUpdate(record)
    } catch (e: any) {
      error = e.message
    } finally {
      loading = false
    }
  }

  async function punchOut() {
    try {
      loading = true; error = ''
      const record = await api.punchOut()
      onUpdate(record)
    } catch (e: any) {
      error = e.message
    } finally {
      loading = false
    }
  }

  $: locationBg = {
    idle: '',
    locating: 'bg-blue-50 text-blue-700',
    ok: 'bg-emerald-50 text-emerald-700',
    far: 'bg-red-50 text-red-700',
    denied: 'bg-amber-50 text-amber-700',
    unavailable: 'bg-amber-50 text-amber-700',
  }[locationStatus]

  $: locationIcon = { idle: MapPin, locating: Loader2, ok: CheckCircle2, far: XCircle, denied: AlertTriangle, unavailable: AlertTriangle }[locationStatus]
</script>

<div class="card">
  <div class="flex items-center justify-between mb-4">
    <h2 class="font-semibold text-gray-900">Today's Attendance</h2>
    <span class="text-sm text-gray-500">
      {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
    </span>
  </div>

  <!-- Live clock -->
  <div class="flex items-center justify-center py-5">
    <div class="text-center">
      <div class="text-5xl font-bold text-gray-900 tabular-nums tracking-tight">
        {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
      </div>
      <div class="text-sm text-gray-500 mt-1">
        {now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
      </div>
    </div>
  </div>

  <!-- Punch times -->
  <div class="grid grid-cols-2 gap-3 mb-4">
    <div class="bg-emerald-50 rounded-xl p-3">
      <div class="flex items-center gap-2 text-emerald-700 mb-1">
        <LogIn size={14} />
        <span class="text-xs font-medium">Punch In</span>
      </div>
      <div class="text-lg font-semibold text-emerald-900">
        {isPunchedIn ? formatTime(todayRecord.punchIn) : '--:--'}
      </div>
    </div>
    <div class="bg-red-50 rounded-xl p-3">
      <div class="flex items-center gap-2 text-red-700 mb-1">
        <LogOut size={14} />
        <span class="text-xs font-medium">Punch Out</span>
      </div>
      <div class="text-lg font-semibold text-red-900">
        {isPunchedOut ? formatTime(todayRecord.punchOut) : '--:--'}
      </div>
    </div>
  </div>

  <!-- Working hours -->
  {#if isPunchedIn}
    <div class="bg-brand-50 rounded-xl p-3 mb-4 flex items-center gap-3">
      <div class="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
        <Timer size={16} class="text-brand-700" />
      </div>
      <div>
        <div class="text-xs text-brand-600 font-medium">
          {isPunchedOut ? 'Total Working Hours' : 'Working Since'}
        </div>
        <div class="text-lg font-semibold text-brand-900">
          {isPunchedOut ? formatHours(todayRecord.workingHours) : formatHours(liveHours)}
          {#if !isPunchedOut}
            <span class="text-xs text-brand-500 font-normal animate-pulse"> (live)</span>
          {/if}
        </div>
      </div>
      {#if todayRecord?.status && isPunchedOut}
        <div class="ml-auto">
          <span class="badge {todayRecord.status === 'full_day' ? 'badge-green' : todayRecord.status === 'overtime' ? 'badge-purple' : 'badge-yellow'}">
            {todayRecord.status === 'full_day' ? 'Full Day' : todayRecord.status === 'overtime' ? 'Overtime' : 'Half Day'}
          </span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Location status banner (shown before punch-in) -->
  {#if !isPunchedIn && locationStatus !== 'idle'}
    <div class="rounded-xl p-3 mb-4 flex items-center gap-3 {locationBg}">
      <svelte:component this={locationIcon} size={18} class="{locationStatus === 'locating' ? 'animate-spin' : ''}" />
      <div class="flex-1 min-w-0">
        {#if locationStatus === 'locating'}
          <p class="text-sm font-medium">Getting your location...</p>
        {:else if locationStatus === 'ok'}
          <p class="text-sm font-medium">Location verified ✓</p>
          {#if distanceFromOffice !== null && officeConfig}
            <p class="text-xs opacity-80">{distanceFromOffice}m from {officeConfig.name}</p>
          {/if}
        {:else if locationStatus === 'far'}
          <p class="text-sm font-medium">Too far from office</p>
          {#if distanceFromOffice !== null && officeConfig}
            <p class="text-xs opacity-80">
              You are {distanceFromOffice}m away · Allowed: {officeConfig.radius}m
            </p>
          {/if}
        {:else if locationStatus === 'denied'}
          <p class="text-sm font-medium">Location permission denied</p>
          <p class="text-xs opacity-80">Allow location in browser settings</p>
        {:else}
          <p class="text-sm font-medium">GPS unavailable</p>
          <p class="text-xs opacity-80">Check your device location settings</p>
        {/if}
      </div>
      {#if locationStatus === 'far' || locationStatus === 'denied' || locationStatus === 'unavailable'}
        <button on:click={checkLocation}
          class="text-xs font-medium underline underline-offset-2 whitespace-nowrap">
          Retry
        </button>
      {/if}
    </div>
  {/if}

  {#if error && locationStatus === 'idle'}
    <div class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3 flex items-start gap-2">
      <AlertTriangle size={14} class="mt-0.5 flex-shrink-0" />
      {error}
    </div>
  {/if}

  <!-- Action buttons -->
  {#if !isPunchedIn}
    <button on:click={punchIn} disabled={loading || locating || locationStatus === 'far'}
      class="btn-success w-full justify-center text-base py-3
        {locationStatus === 'far' ? 'opacity-50 cursor-not-allowed' : ''}">
      {#if locating}
        <Loader2 size={18} class="animate-spin" />
        Getting location...
      {:else if loading}
        <Loader2 size={18} class="animate-spin" />
        Punching in...
      {:else}
        <LogIn size={18} />
        Punch In
      {/if}
    </button>
    {#if officeConfig && locationStatus === 'idle'}
      <p class="text-xs text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
        <MapPin size={11} />
        Location will be verified against {officeConfig.name}
      </p>
    {/if}
  {:else if !isPunchedOut}
    <button on:click={punchOut} disabled={loading}
      class="btn-danger w-full justify-center text-base py-3">
      {#if loading}
        <Loader2 size={18} class="animate-spin" />
        Processing...
      {:else}
        <LogOut size={18} />
        Punch Out
      {/if}
    </button>
  {:else}
    <div class="text-center py-3 text-sm text-gray-500 bg-gray-50 rounded-xl">
      Attendance marked for today ✓
    </div>
  {/if}
</div>
