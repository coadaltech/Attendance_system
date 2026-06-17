<script lang="ts">
  import { onMount } from 'svelte'
  import { user, isAdmin } from '$lib/stores/auth'
  import { api } from '$lib/api'
  import { getLeaveStatusBadge, getLeaveTypeBadge, formatDate } from '$lib/utils'
  import { Plus, X, Check, XCircle } from 'lucide-svelte'

  let myLeaves: any[] = []
  let allLeaves: any[] = []
  let balance: any = null
  let loading = true
  let showApplyForm = false
  let rejectModal: { id: number; show: boolean } = { id: 0, show: false }
  let rejectReason = ''
  let formError = ''
  let submitting = false
  let activeTab: 'my' | 'all' = 'my'

  let form = { leaveType: 'casual', startDate: '', endDate: '', reason: '' }

  async function load() {
    loading = true
    try {
      const [leaves, bal] = await Promise.all([api.getMyLeaves(), api.getLeaveBalance()])
      myLeaves = leaves; balance = bal
      if ($isAdmin) allLeaves = await api.getAllLeaves()
    } finally { loading = false }
  }

  onMount(load)

  async function applyLeave() {
    if (!form.startDate || !form.endDate || !form.reason) { formError = 'All fields are required'; return }
    if (new Date(form.endDate) < new Date(form.startDate)) { formError = 'End date must be after start date'; return }
    try {
      submitting = true; formError = ''
      await api.applyLeave(form)
      showApplyForm = false
      form = { leaveType: 'casual', startDate: '', endDate: '', reason: '' }
      await load()
    } catch (e: any) {
      formError = e.message
    } finally { submitting = false }
  }

  async function cancelLeave(id: number) {
    if (!confirm('Cancel this leave request?')) return
    await api.cancelLeave(id)
    await load()
  }

  async function approveLeave(id: number) {
    await api.approveLeave(id)
    await load()
  }

  async function rejectLeave() {
    if (!rejectReason) return
    await api.rejectLeave(rejectModal.id, rejectReason)
    rejectModal = { id: 0, show: false }; rejectReason = ''
    await load()
  }

  $: totalAvailable = balance
    ? (balance.sickLeave - balance.sickUsed) + (balance.casualLeave - balance.casualUsed) +
      (balance.earnedLeave - balance.earnedUsed) + (balance.wfhLeave - balance.wfhUsed)
    : 0
</script>

<svelte:head><title>Leave Management · Coadal Attendance</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Leave Management</h1>
    <button on:click={() => showApplyForm = true} class="btn-primary">
      <Plus size={16} /> Apply for Leave
    </button>
  </div>

  {#if loading}
    <div class="card animate-pulse h-32"></div>
  {:else}
    <!-- Leave balance cards -->
    {#if balance}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {#each [
          { label: 'Sick Leave', total: balance.sickLeave, used: balance.sickUsed, color: 'red' },
          { label: 'Casual Leave', total: balance.casualLeave, used: balance.casualUsed, color: 'blue' },
          { label: 'Earned Leave', total: balance.earnedLeave, used: balance.earnedUsed, color: 'green' },
          { label: 'Work From Home', total: balance.wfhLeave, used: balance.wfhUsed, color: 'purple' },
        ] as lb}
          {@const remaining = lb.total - lb.used}
          {@const pct = Math.round((lb.used / lb.total) * 100)}
          <div class="card">
            <div class="mb-2">
              <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-tight">{lb.label}</p>
              <p class="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{remaining}<span class="text-xs text-gray-400 dark:text-gray-500 font-normal ml-0.5">/{lb.total}</span></p>
            </div>
            <div class="w-full bg-[var(--color-subtle)] rounded-full h-1.5 mb-1">
              <div class="h-1.5 rounded-full bg-{lb.color}-500 transition-all" style="width:{pct}%"></div>
            </div>
            <p class="text-xs text-gray-400 dark:text-gray-500">{lb.used} used · {remaining} left</p>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Tabs (admin) -->
    {#if $isAdmin}
      <div class="flex gap-1 bg-[var(--color-subtle)] p-1 rounded-lg w-fit">
        <button on:click={() => activeTab = 'my'}
          class="px-4 py-1.5 text-sm font-medium rounded-md transition-colors
            {activeTab === 'my' ? 'bg-[var(--color-card)] shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}">
          My Leaves
        </button>
        <button on:click={() => activeTab = 'all'}
          class="px-4 py-1.5 text-sm font-medium rounded-md transition-colors
            {activeTab === 'all' ? 'bg-[var(--color-card)] shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}">
          All Leaves
          {#if allLeaves.filter(l => l.status === 'pending').length > 0}
            <span class="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {allLeaves.filter(l => l.status === 'pending').length}
            </span>
          {/if}
        </button>
      </div>
    {/if}

    <!-- Leaves table -->
    {@const displayLeaves = $isAdmin && activeTab === 'all' ? allLeaves : myLeaves}
    <div class="card overflow-hidden p-0">
      <div class="px-6 py-4 border-b border-[var(--color-border)]">
        <h2 class="font-semibold text-gray-900 dark:text-gray-100">{$isAdmin && activeTab === 'all' ? 'All Employee Leaves' : 'My Leave Requests'}</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-[var(--color-faint)]">
            <tr>
              {#if $isAdmin && activeTab === 'all'}
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">Employee</th>
              {/if}
              {#each ['Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Actions'] as h}
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">{h}</th>
              {/each}
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-divide)]">
            {#each displayLeaves as leave}
              {@const statusBadge = getLeaveStatusBadge(leave.status)}
              {@const typeBadge = getLeaveTypeBadge(leave.leaveType)}
              <tr class="hover:bg-[var(--color-faint)] transition-colors">
                {#if $isAdmin && activeTab === 'all'}
                  <td class="px-4 py-3">
                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{leave.employee?.name}</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500">{leave.employee?.department}</p>
                  </td>
                {/if}
                <td class="px-4 py-3"><span class="{typeBadge.class}">{typeBadge.label}</span></td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(leave.startDate)}</td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(leave.endDate)}</td>
                <td class="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">{leave.totalDays}d</td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{leave.reason}</td>
                <td class="px-4 py-3"><span class="{statusBadge.class}">{statusBadge.label}</span></td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-1">
                    {#if $isAdmin && activeTab === 'all' && leave.status === 'pending'}
                      <button on:click={() => approveLeave(leave.id)}
                        class="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 rounded-lg transition-colors" title="Approve">
                        <Check size={14} />
                      </button>
                      <button on:click={() => { rejectModal = { id: leave.id, show: true } }}
                        class="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/15 rounded-lg transition-colors" title="Reject">
                        <XCircle size={14} />
                      </button>
                    {:else if leave.status === 'pending' && activeTab !== 'all'}
                      <button on:click={() => cancelLeave(leave.id)}
                        class="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/15 rounded-lg transition-colors" title="Cancel">
                        <X size={14} />
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>
            {:else}
              <tr>
                <td colspan="8" class="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">No leave records found</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<!-- Apply Leave Modal -->
{#if showApplyForm}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div class="bg-modal border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md">
      <div class="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Apply for Leave</h2>
        <button on:click={() => { showApplyForm = false; formError = '' }} class="p-2 hover:bg-[var(--color-subtle)] rounded-lg text-gray-500 dark:text-gray-400">
          <X size={18} />
        </button>
      </div>
      <form on:submit|preventDefault={applyLeave} class="p-6 space-y-4">
        <div>
          <label for="leave-type" class="label">Leave Type</label>
          <select id="leave-type" bind:value={form.leaveType} class="input">
            <option value="casual">Casual Leave</option>
            <option value="sick">Sick Leave</option>
            <option value="earned">Earned Leave</option>
            <option value="wfh">Work From Home</option>
          </select>
        </div>
        <div class="grid sm:grid-cols-2 gap-3">
          <div>
            <label for="leave-start" class="label">From Date</label>
            <input id="leave-start" type="date" bind:value={form.startDate} class="input" min={new Date().toISOString().split('T')[0]} required />
          </div>
          <div>
            <label for="leave-end" class="label">To Date</label>
            <input id="leave-end" type="date" bind:value={form.endDate} class="input" min={form.startDate || new Date().toISOString().split('T')[0]} required />
          </div>
        </div>
        <div>
          <label for="leave-reason" class="label">Reason</label>
          <textarea id="leave-reason" bind:value={form.reason} class="input resize-none" rows="3" placeholder="Brief reason for leave..." required></textarea>
        </div>
        {#if formError}
          <div class="text-sm text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{formError}</div>
        {/if}
        <div class="flex gap-3 pt-2">
          <button type="button" on:click={() => showApplyForm = false} class="btn-secondary flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={submitting} class="btn-primary flex-1 justify-center">
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Reject Modal -->
{#if rejectModal.show}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div class="bg-modal border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-sm p-6">
      <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">Reject Leave Request</h3>
      <label for="reject-reason" class="label">Reason for rejection</label>
      <textarea id="reject-reason" bind:value={rejectReason} class="input resize-none" rows="3" placeholder="Enter reason..."></textarea>
      <div class="flex gap-3 mt-4">
        <button on:click={() => { rejectModal = { id: 0, show: false }; rejectReason = '' }} class="btn-secondary flex-1 justify-center">Cancel</button>
        <button on:click={rejectLeave} disabled={!rejectReason} class="btn-danger flex-1 justify-center">Reject</button>
      </div>
    </div>
  </div>
{/if}
