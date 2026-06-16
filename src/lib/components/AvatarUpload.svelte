<script lang="ts">
  import { Camera } from 'lucide-svelte'
  import { createEventDispatcher } from 'svelte'
  import { api } from '$lib/api'

  export let employeeId: number
  export let name: string
  export let avatar: string | null | undefined = null
  export let size: 'sm' | 'md' | 'lg' = 'md'
  export let editable = true

  const dispatch = createEventDispatcher<{ change: string }>()
  let uploading = false
  let fileInput: HTMLInputElement

  const sizeMap = {
    sm: { wrap: 'w-8 h-8',   text: 'text-xs',  icon: 12 },
    md: { wrap: 'w-12 h-12', text: 'text-base', icon: 14 },
    lg: { wrap: 'w-20 h-20', text: 'text-2xl',  icon: 18 },
  }
  $: s = sizeMap[size]

  function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = reject
      reader.onload = ev => {
        const img = new Image()
        img.onerror = reject
        img.onload = () => {
          const dim = 300
          const canvas = document.createElement('canvas')
          canvas.width = dim; canvas.height = dim
          const ctx = canvas.getContext('2d')!
          const min = Math.min(img.width, img.height)
          const sx = (img.width - min) / 2
          const sy = (img.height - min) / 2
          ctx.drawImage(img, sx, sy, min, min, 0, 0, dim, dim)
          resolve(canvas.toDataURL('image/jpeg', 0.82))
        }
        img.src = ev.target!.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  async function onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      uploading = true
      const dataUrl = await compressImage(file)
      await api.updateEmployee(employeeId, { avatar: dataUrl })
      dispatch('change', dataUrl)
    } finally {
      uploading = false
      fileInput.value = ''
    }
  }
</script>

<div
  class="relative flex-shrink-0 {s.wrap} {editable ? 'cursor-pointer group' : ''}"
  on:click={() => editable && fileInput.click()}
  on:keydown={e => editable && e.key === 'Enter' && fileInput.click()}
  role={editable ? 'button' : undefined}
  tabindex={editable ? 0 : undefined}
  aria-label={editable ? 'Change profile photo' : undefined}
>
  {#if avatar}
    <img src={avatar} alt={name} class="w-full h-full rounded-full object-cover" />
  {:else}
    <div class="w-full h-full rounded-full bg-brand-600 flex items-center justify-center text-white font-bold {s.text}">
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  {/if}

  {#if editable}
    <div class="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
      {#if uploading}
        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      {:else}
        <Camera size={s.icon} class="text-white" />
      {/if}
    </div>
  {/if}
</div>

{#if editable}
  <input bind:this={fileInput} type="file" accept="image/*" class="hidden" on:change={onFileChange} />
{/if}
