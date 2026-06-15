<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { isAdmin } from '$lib/stores/auth'
  import { api } from '$lib/api'
  import { formatDate, formatTime, formatHours, getStatusBadge } from '$lib/utils'
  import { Plus, X, UserCheck, UserX, Eye, EyeOff, Search } from 'lucide-svelte'

  let showPassword = false

  let employees: any[] = []
  let loading = true
  let showAdd = false
  let viewEmployee: any = null
  let empAttendance: any[] = []
  let empLeaveBalance: any = null
  let search = ''
  let formError = ''
  let submitting = false

  // Leave balance editor state
  let leaveForm = { sickLeave: 12, casualLeave: 12, earnedLeave: 15, wfhLeave: 24 }
  let leaveSaving = false
  let leaveSaved = false
  let leaveError = ''

  let form = {
    name: '', email: '', password: '', employeeCode: '',
    department: '', designation: '', phone: '', role: 'employee', joinDate: '',
  }

  onMount(async () => {
    if (!$isAdmin) { goto('/dashboard'); return }
    await loadEmployees()
  })

  async function loadEmployees() {
    loading = true
    try { employees = await api.getEmployees() }
    finally { loading = false }
  }

  async function viewDetails(emp: any) {
    viewEmployee = emp
    leaveSaved = false; leaveError = ''
    const now = new Date()
    const [att, lb] = await Promise.all([
      api.getEmployeeAttendance(emp.id, now.getMonth() + 1, now.getFullYear()),
      api.getEmployeeLeaveBalance(emp.id),
    ])
    empAttendance = att
    empLeaveBalance = lb
    leaveForm = {
      sickLeave: lb?.sickLeave ?? 12,
      casualLeave: lb?.casualLeave ?? 12,
      earnedLeave: lb?.earnedLeave ?? 15,
      wfhLeave: lb?.wfhLeave ?? 24,
    }
  }

  async function saveLeaveBalance() {
    if (!viewEmployee) return
    try {
      leaveSaving = true; leaveError = ''; leaveSaved = false
      empLeaveBalance = await api.setEmployeeLeaveBalance(viewEmployee.id, leaveForm)
      leaveSaved = true
      setTimeout(() => leaveSaved = false, 3000)
    } catch (e: any) {
      leaveError = e.message
    } finally { leaveSaving = false }
  }

  async function addEmployee() {
    if (!form.name || !form.email || !form.password || !form.employeeCode) {
      formError = 'Name, email, password, and employee code are required'
      return
    }
    try {
      submitting = true; formError = ''
      await api.createEmployee(form)
      showAdd = false
      form = { name: '', email: '', password: '', employeeCode: '', department: '', designation: '', phone: '', role: 'employee', joinDate: '' }
      await loadEmployees()
    } catch (e: any) {
      formError = e.message
    } finally { submitting = false }
  }

  async function toggleActive(emp: any) {
    await api.toggleEmployee(emp.id)
    await loadEmployees()
  }

  $: filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    e.employeeCode?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  )
</script>

<svelte:head><title>Employees · Coadal Attendance</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900">Employees</h1>
    <button on:click={() => showAdd = true} class="btn-primary">
      <Plus size={16} /> Add Employee
    </button>
  </div>

  <!-- Search -->
  <div class="relative">
    <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
    <input bind:value={search} type="text" placeholder="Search by name, email, code or department..."
      class="input pl-9" />
  </div>

  {#if loading}
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each Array(6) as _}
        <div class="card animate-pulse h-36"></div>
      {/each}
    </div>
  {:else}
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each filtered as emp}
        <div class="card hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold">
                {emp.name.charAt(0)}
              </div>
              <div>
                <p class="font-semibold text-gray-900">{emp.name}</p>
                <p class="text-xs text-gray-500">{emp.employeeCode}</p>
              </div>
            </div>
            <span class="badge {emp.isActive ? 'badge-green' : 'badge-red'}">
              {emp.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div class="mt-3 space-y-1 text-xs text-gray-500">
            <p>{emp.email}</p>
            {#if emp.department}<p>{emp.department} · {emp.designation || ''}</p>{/if}
            {#if emp.joinDate}<p>Joined {formatDate(emp.joinDate)}</p>{/if}
          </div>
          <div class="flex gap-2 mt-4">
            <button on:click={() => viewDetails(emp)} class="btn-secondary flex-1 justify-center text-xs py-1.5">
              <Eye size={13} /> View
            </button>
            <button on:click={() => toggleActive(emp)}
              class="btn-secondary flex-1 justify-center text-xs py-1.5 {emp.isActive ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}">
              {#if emp.isActive}<UserX size={13} />{:else}<UserCheck size={13} />{/if}
              {emp.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      {:else}
        <div class="card col-span-3 text-center py-8 text-gray-400">No employees found</div>
      {/each}
    </div>
  {/if}
</div>

<!-- Add Employee Modal -->
{#if showAdd}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
      <div class="flex items-center justify-between p-6 border-b border-gray-100">
        <h2 class="text-lg font-semibold text-gray-900">Add New Employee</h2>
        <button on:click={() => { showAdd = false; formError = ''; showPassword = false }} class="p-2 hover:bg-gray-100 rounded-lg">
          <X size={18} />
        </button>
      </div>
      <form on:submit|preventDefault={addEmployee} class="p-6 space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="emp-name" class="label">Full Name *</label>
            <input id="emp-name" bind:value={form.name} class="input" placeholder="John Doe" required />
          </div>
          <div>
            <label for="emp-code" class="label">Employee Code *</label>
            <input id="emp-code" bind:value={form.employeeCode} class="input" placeholder="CT-004" required />
          </div>
          <div>
            <label for="emp-email" class="label">Email *</label>
            <input id="emp-email" type="email" bind:value={form.email} class="input" placeholder="john@coadal.com" required />
          </div>
          <div>
            <label for="emp-password" class="label">Password *</label>
            <div class="relative">
              <input id="emp-password" type={showPassword ? 'text' : 'password'} bind:value={form.password}
                class="input pr-10" placeholder="Min 8 chars" required />
              <button type="button" on:click={() => showPassword = !showPassword}
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {#if showPassword}
                  <EyeOff size={16} />
                {:else}
                  <Eye size={16} />
                {/if}
              </button>
            </div>
          </div>
          <div>
            <label for="emp-dept" class="label">Department</label>
            <input id="emp-dept" bind:value={form.department} class="input" placeholder="Engineering" />
          </div>
          <div>
            <label for="emp-desig" class="label">Designation</label>
            <input id="emp-desig" bind:value={form.designation} class="input" placeholder="Software Engineer" />
          </div>
          <div>
            <label for="emp-phone" class="label">Phone</label>
            <input id="emp-phone" bind:value={form.phone} class="input" placeholder="9876543210" />
          </div>
          <div>
            <label for="emp-role" class="label">Role</label>
            <select id="emp-role" bind:value={form.role} class="input">
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="col-span-2">
            <label for="emp-join" class="label">Join Date</label>
            <input id="emp-join" type="date" bind:value={form.joinDate} class="input" />
          </div>
        </div>
        {#if formError}
          <div class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</div>
        {/if}
        <div class="flex gap-3 pt-2">
          <button type="button" on:click={() => { showAdd = false; showPassword = false }} class="btn-secondary flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={submitting} class="btn-primary flex-1 justify-center">
            {submitting ? 'Adding...' : 'Add Employee'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- View Employee Modal -->
{#if viewEmployee}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-100">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-brand-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
            {viewEmployee.name.charAt(0)}
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900">{viewEmployee.name}</h2>
            <p class="text-sm text-gray-500">{viewEmployee.employeeCode} · {viewEmployee.department || 'N/A'}</p>
          </div>
        </div>
        <button on:click={() => viewEmployee = null} class="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
      </div>

      <div class="p-6 space-y-5">
        <!-- Info grid -->
        <div class="grid grid-cols-2 gap-3 text-sm">
          {#each [
            { label: 'Email', value: viewEmployee.email },
            { label: 'Phone', value: viewEmployee.phone || '-' },
            { label: 'Designation', value: viewEmployee.designation || '-' },
            { label: 'Join Date', value: formatDate(viewEmployee.joinDate) },
          ] as info}
            <div class="bg-gray-50 rounded-lg p-3">
              <p class="text-xs text-gray-500">{info.label}</p>
              <p class="font-medium text-gray-900 mt-0.5">{info.value}</p>
            </div>
          {/each}
        </div>

        <!-- ── Leave Balance Editor ── -->
        <div class="border border-gray-200 rounded-xl overflow-hidden">
          <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-900">Leave Allocation (This Year)</h3>
            {#if empLeaveBalance}
              <span class="text-xs text-gray-400">Used / Allocated</span>
            {/if}
          </div>
          <div class="p-4 space-y-3">
            <div class="grid grid-cols-2 gap-3">
              {#each [
                { key: 'sickLeave', label: 'Sick Leave', used: empLeaveBalance?.sickUsed ?? 0, color: 'red' },
                { key: 'casualLeave', label: 'Casual Leave', used: empLeaveBalance?.casualUsed ?? 0, color: 'blue' },
                { key: 'earnedLeave', label: 'Earned Leave', used: empLeaveBalance?.earnedUsed ?? 0, color: 'green' },
                { key: 'wfhLeave', label: 'Work From Home', used: empLeaveBalance?.wfhUsed ?? 0, color: 'purple' },
              ] as lb}
                <div class="bg-gray-50 rounded-lg p-3">
                  <div class="flex items-center justify-between mb-2">
                    <label for="lb-{lb.key}" class="text-xs font-medium text-gray-600">{lb.label}</label>
                    <span class="text-xs text-gray-400">{lb.used} used</span>
                  </div>
                  <input id="lb-{lb.key}" type="number" min="0" max="365"
                    bind:value={leaveForm[lb.key]}
                    class="input py-1.5 text-sm text-center font-semibold" />
                  <div class="text-xs text-gray-400 text-center mt-1">
                    {leaveForm[lb.key] - lb.used} remaining
                  </div>
                </div>
              {/each}
            </div>
            {#if leaveError}
              <p class="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{leaveError}</p>
            {/if}
            <button on:click={saveLeaveBalance} disabled={leaveSaving}
              class="btn-primary w-full justify-center py-2 text-sm">
              {#if leaveSaving}
                Saving...
              {:else if leaveSaved}
                ✓ Saved
              {:else}
                Save Leave Balance
              {/if}
            </button>
          </div>
        </div>

        <!-- This month attendance -->
        <div>
          <h3 class="text-sm font-semibold text-gray-900 mb-2">This Month Attendance</h3>
          <div class="overflow-x-auto rounded-lg border border-gray-100">
            <table class="w-full text-xs">
              <thead class="bg-gray-50">
                <tr>
                  {#each ['Date', 'In', 'Out', 'Hours', 'Status'] as h}
                    <th class="px-3 py-2 text-left text-gray-500 font-semibold uppercase">{h}</th>
                  {/each}
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                {#each empAttendance.slice(0, 8) as rec}
                  {@const badge = getStatusBadge(rec.status)}
                  <tr>
                    <td class="px-3 py-2 text-gray-700">{new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                    <td class="px-3 py-2">{formatTime(rec.punchIn)}</td>
                    <td class="px-3 py-2">{formatTime(rec.punchOut)}</td>
                    <td class="px-3 py-2">{rec.workingHours ? formatHours(rec.workingHours) : '-'}</td>
                    <td class="px-3 py-2"><span class="{badge.class}">{badge.label}</span></td>
                  </tr>
                {:else}
                  <tr><td colspan="5" class="px-3 py-4 text-center text-gray-400">No records this month</td></tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
