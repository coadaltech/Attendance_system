<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { isAdmin } from '$lib/stores/auth'
  import { api } from '$lib/api'
  import { formatDate, formatTime, formatHours, getStatusBadge, downloadCSV } from '$lib/utils'
  import { Plus, X, UserCheck, UserX, Eye, EyeOff, Search, Trash2, Download } from 'lucide-svelte'
  import AvatarUpload from '$lib/components/AvatarUpload.svelte'
  import DateRangeModal from '$lib/components/DateRangeModal.svelte'
  import { user as currentUser } from '$lib/stores/auth'
  import { authStore } from '$lib/stores/auth'

  let showPassword = false

  let employees: any[] = []
  let loading = true
  let showAdd = false
  let viewEmployee: any = null
  let empAttendance: any[] = []
  let empLeaveBalance: any = null

  // Platform start = earliest createdAt among non-admin employees
  // (admin may have been created earlier for system setup)
  $: platformStart = (() => {
    const nonAdmins = employees.filter(e => e.role !== 'admin' && e.createdAt)
    if (nonAdmins.length === 0) return null
    return nonAdmins.reduce((earliest: Date, e: any) => {
      const d = new Date(e.createdAt); d.setHours(0, 0, 0, 0)
      return d < earliest ? d : earliest
    }, new Date(nonAdmins[0].createdAt))
  })()

  // Merge actual records + inferred absent rows for past working days since tracking start
  $: displayAttendance = (() => {
    const now = new Date()
    const todayMidnight = new Date(now); todayMidnight.setHours(0, 0, 0, 0)
    const year = now.getFullYear(), month = now.getMonth() + 1
    const lastDay = new Date(year, month, 0).getDate()

    const trackingStart = (() => {
      const monthStart = new Date(year, month - 1, 1)
      // Use the later of: platform start or this employee's own createdAt
      const candidates: Date[] = []
      if (platformStart) candidates.push(platformStart)
      if (viewEmployee?.createdAt) {
        const d = new Date(viewEmployee.createdAt); d.setHours(0, 0, 0, 0)
        candidates.push(d)
      }
      if (candidates.length === 0) return monthStart
      const best = candidates.reduce((latest, d) => d > latest ? d : latest, candidates[0])
      return best > monthStart ? best : monthStart
    })()

    const attMap: Record<string, any> = Object.fromEntries(empAttendance.map(r => [r.date, r]))
    const rows: any[] = []
    for (let d = 1; d <= lastDay; d++) {
      const dayDate = new Date(year, month - 1, d)
      if (dayDate < trackingStart) continue
      if (dayDate > todayMidnight) break
      if (dayDate.getDay() === 0) continue // Sunday only
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const record = attMap[dateStr]
      if (record) {
        rows.push(record)
      } else if (dayDate < todayMidnight) {
        rows.push({ date: dateStr, punchIn: null, punchOut: null, workingHours: null, status: 'absent' })
      }
    }
    return rows.reverse()
  })()
  let search = ''
  let formError = ''
  let submitting = false

  let showAdminPassModal = false
  let adminPassForm = { password: '', confirm: '' }
  let adminPassSaving = false
  let adminPassError = ''
  let adminPassSuccess = false
  let adminPassShow = false

  function openAdminPassModal() {
    adminPassForm = { password: '', confirm: '' }
    adminPassError = ''; adminPassSuccess = false; adminPassShow = false
    showAdminPassModal = true
  }

  async function saveAdminPassword() {
    if (!adminPassForm.password) { adminPassError = 'New password bharo'; return }
    if (adminPassForm.password.length < 8) { adminPassError = 'Password kam se kam 8 characters ka hona chahiye'; return }
    if (adminPassForm.password !== adminPassForm.confirm) { adminPassError = 'Passwords match nahi kar rahe'; return }
    try {
      adminPassSaving = true; adminPassError = ''
      await api.updateEmployee(viewEmployee.id, { password: adminPassForm.password })
      adminPassSuccess = true
      setTimeout(() => { showAdminPassModal = false; adminPassSuccess = false }, 1800)
    } catch (e: any) { adminPassError = e.message }
    finally { adminPassSaving = false }
  }

  let editMode = false
  let editSaving = false
  let editError = ''
  let editShowPass = false
  let editForm = {
    name: '', email: '', employeeCode: '', department: '',
    designation: '', phone: '', role: 'employee', joinDate: '', password: '',
  }

  function enterEdit() {
    editForm = {
      name: viewEmployee.name ?? '',
      email: viewEmployee.email ?? '',
      employeeCode: viewEmployee.employeeCode ?? '',
      department: viewEmployee.department ?? '',
      designation: viewEmployee.designation ?? '',
      phone: viewEmployee.phone ?? '',
      role: viewEmployee.role ?? 'employee',
      joinDate: viewEmployee.joinDate ?? '',
      password: '',
    }
    editError = ''; editShowPass = false; editMode = true
  }

  async function saveEdit() {
    if (!editForm.name || !editForm.email || !editForm.employeeCode) {
      editError = 'Name, email, and employee code are required'; return
    }
    try {
      editSaving = true; editError = ''
      const payload: any = {
        name: editForm.name, email: editForm.email, employeeCode: editForm.employeeCode,
        department: editForm.department || undefined, designation: editForm.designation || undefined,
        phone: editForm.phone || undefined, role: editForm.role,
        joinDate: editForm.joinDate || undefined,
      }
      if (editForm.password) payload.password = editForm.password
      const updated = await api.updateEmployee(viewEmployee.id, payload)
      viewEmployee = { ...viewEmployee, ...updated }
      employees = employees.map(e => e.id === viewEmployee.id ? { ...e, ...updated } : e)
      editMode = false
    } catch (e: any) {
      editError = e.message
    } finally { editSaving = false }
  }

  let showResetModal = false
  let resetConfirmText = ''
  let resetting = false
  let resetError = ''

  let deleteModal: { show: boolean; employee: any } = { show: false, employee: null }
  let deleteConfirmText = ''
  let deleting = false
  let deleteError = ''

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
    showExportRangeModal = false
    const now = new Date()
    const [att, lb] = await Promise.all([
      api.getEmployeeAttendance(emp.id, now.getMonth() + 1, now.getFullYear()),
      api.getEmployeeLeaveBalance(emp.id),
    ])
    empAttendance = att
    empLeaveBalance = lb
    leaveForm = {
      sickLeave:   lb?.sickLeave   ?? 12,
      casualLeave: lb?.casualLeave ?? 12,
      earnedLeave: lb?.earnedLeave ?? 0,
      wfhLeave:    lb?.wfhLeave    ?? 0,
    }
  }

  let showExportRangeModal = false
  let exportRangeLoading = false

  async function exportEmployeeCSVRange(rangeStart: string, rangeEnd: string) {
    if (!viewEmployee) return
    try {
      exportRangeLoading = true
      const records = await api.getEmployeeAttendanceRange(viewEmployee.id, rangeStart, rangeEnd)
      const recMap: Record<string, any> = Object.fromEntries(records.map((r: any) => [r.date, r]))

      const candidates: Date[] = []
      if (platformStart) candidates.push(platformStart)
      if (viewEmployee.createdAt) {
        const d = new Date(viewEmployee.createdAt); d.setHours(0, 0, 0, 0)
        candidates.push(d)
      }
      const rangeTrackingStart = candidates.length
        ? candidates.reduce((latest, d) => d > latest ? d : latest, candidates[0])
        : null
      const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0)

      const header = ['Date', 'Day', 'Punch In', 'Punch Out', 'Hours', 'Status']
      const rows: string[][] = []
      for (let d = new Date(rangeStart + 'T00:00:00'); d <= new Date(rangeEnd + 'T00:00:00'); d.setDate(d.getDate() + 1)) {
        if (rangeTrackingStart && d < rangeTrackingStart) continue
        if (d > todayMidnight) break
        if (d.getDay() === 0) continue
        const dateStr = d.toISOString().split('T')[0]
        const record = recMap[dateStr] ?? { punchIn: null, punchOut: null, workingHours: null, status: 'absent' }
        const badge = getStatusBadge(record.status)
        const dayName = d.toLocaleDateString('en-IN', { weekday: 'long' })
        rows.push([formatDate(dateStr), dayName, formatTime(record.punchIn), formatTime(record.punchOut),
          record.workingHours ? formatHours(record.workingHours) : '-', badge.label])
      }
      downloadCSV(`${viewEmployee.name}_${rangeStart}_to_${rangeEnd}.csv`, [header, ...rows])
      showExportRangeModal = false
    } finally {
      exportRangeLoading = false
    }
  }

  async function saveLeaveBalance() {
    if (!viewEmployee) return
    try {
      leaveSaving = true; leaveError = ''; leaveSaved = false
      const payload = {
        sickLeave:   leaveForm.sickLeave   ?? 0,
        casualLeave: leaveForm.casualLeave ?? 0,
        earnedLeave: leaveForm.earnedLeave ?? 0,
        wfhLeave:    leaveForm.wfhLeave    ?? 0,
      }
      empLeaveBalance = await api.setEmployeeLeaveBalance(viewEmployee.id, payload)
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

  function openDeleteModal(emp: any) {
    if (emp.isActive) return
    deleteModal = { show: true, employee: emp }
    deleteConfirmText = ''; deleteError = ''
  }

  async function confirmDeleteEmployee() {
    if (deleteConfirmText !== 'DELETE' || !deleteModal.employee) return
    const id = deleteModal.employee.id
    try {
      deleting = true; deleteError = ''
      await api.deleteEmployee(id)
      deleteModal = { show: false, employee: null }
      deleteConfirmText = ''
      if (viewEmployee?.id === id) viewEmployee = null
      await loadEmployees()
    } catch (e: any) {
      deleteError = e.message
    } finally { deleting = false }
  }

  async function resetAllData() {
    if (resetConfirmText !== 'RESET') return
    try {
      resetting = true; resetError = ''
      await api.resetAllData()
      showResetModal = false
      resetConfirmText = ''
      await loadEmployees()
    } catch (e: any) {
      resetError = e.message
    } finally { resetting = false }
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
    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Employees</h1>
    <div class="flex items-center gap-2 flex-shrink-0">
      <button on:click={() => { showResetModal = true; resetConfirmText = ''; resetError = '' }}
        class="btn-secondary text-red-600 dark:text-red-400 hover:bg-red-500/15 border-red-500/30 px-2.5 sm:px-4">
        <Trash2 size={16} />
        <span class="hidden sm:inline">Reset All Data</span>
      </button>
      <button on:click={() => showAdd = true} class="btn-primary">
        <Plus size={16} /> Add Employee
      </button>
    </div>
  </div>

  <!-- Search -->
  <div class="relative">
    <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
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
              {#if emp.avatar}
                <img src={emp.avatar} alt={emp.name} class="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              {:else}
                <div class="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  {emp.name.charAt(0)}
                </div>
              {/if}
              <div>
                <p class="font-semibold text-gray-900 dark:text-gray-100">{emp.name}</p>
                <p class="text-xs text-gray-400 dark:text-gray-500">{emp.employeeCode}</p>
              </div>
            </div>
            <span class="badge {emp.isActive ? 'badge-green' : 'badge-red'}">
              {emp.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div class="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
            <p>{emp.email}</p>
            {#if emp.department}<p>{emp.department} · {emp.designation || ''}</p>{/if}
            {#if emp.joinDate}<p>Joined {formatDate(emp.joinDate)}</p>{/if}
          </div>
          <div class="flex gap-2 mt-4">
            <button on:click={() => viewDetails(emp)} class="btn-secondary flex-1 justify-center text-xs py-1.5">
              <Eye size={13} /> View
            </button>
            <button on:click={() => toggleActive(emp)}
              class="btn-secondary flex-1 justify-center text-xs py-1.5 {emp.isActive ? 'text-red-600 dark:text-red-400 hover:bg-red-500/15' : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15'}">
              {#if emp.isActive}<UserX size={13} />{:else}<UserCheck size={13} />{/if}
              {emp.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button on:click={() => openDeleteModal(emp)} disabled={emp.isActive}
              title={emp.isActive ? 'Deactivate the employee before deleting' : 'Delete Employee'}
              class="btn-secondary justify-center text-xs py-1.5 px-2.5
                {emp.isActive ? 'opacity-40 cursor-not-allowed' : 'text-red-600 dark:text-red-400 hover:bg-red-500/15 border-red-500/30'}">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      {:else}
        <div class="card col-span-3 text-center py-8 text-gray-400 dark:text-gray-500">No employees found</div>
      {/each}
    </div>
  {/if}
</div>

<!-- Add Employee Modal -->
{#if showAdd}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
    <div class="bg-modal border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-lg my-4">
      <div class="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Add New Employee</h2>
        <button on:click={() => { showAdd = false; formError = ''; showPassword = false }} class="p-2 hover:bg-[var(--color-subtle)] rounded-lg text-gray-500 dark:text-gray-400">
          <X size={18} />
        </button>
      </div>
      <form on:submit|preventDefault={addEmployee} class="p-6 space-y-4">
        <div class="grid sm:grid-cols-2 gap-3">
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
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                {#if showPassword}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
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
          <div class="text-sm text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{formError}</div>
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

<!-- Reset All Data Modal -->
{#if showResetModal}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div class="bg-modal border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md">
      <div class="flex items-center justify-between p-6 border-b border-red-500/20">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-red-500/15 rounded-full flex items-center justify-center">
            <Trash2 size={18} class="text-red-600 dark:text-red-400" />
          </div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Reset All Data</h2>
        </div>
        <button on:click={() => showResetModal = false} class="p-2 hover:bg-[var(--color-subtle)] rounded-lg text-gray-500 dark:text-gray-400"><X size={18} /></button>
      </div>
      <div class="p-6 space-y-4">
        <div class="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-600 dark:text-red-400 space-y-1">
          <p class="font-semibold">Yeh action permanent hai aur undo nahi ho sakti:</p>
          <ul class="list-disc pl-4 space-y-0.5 mt-1">
            <li>Saare employees delete ho jayenge</li>
            <li>Saara attendance data delete ho jayega</li>
            <li>Saari leaves aur leave balances delete ho jayengi</li>
            <li>Sirf aapka admin account bachega</li>
          </ul>
        </div>
        <div>
          <label for="reset-confirm" class="label">Confirm karne ke liye <span class="font-mono font-bold text-red-500">RESET</span> type karein</label>
          <input id="reset-confirm" bind:value={resetConfirmText} class="input" placeholder="RESET" autocomplete="off" />
        </div>
        {#if resetError}
          <p class="text-sm text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{resetError}</p>
        {/if}
        <div class="flex gap-3 pt-1">
          <button on:click={() => showResetModal = false} class="btn-secondary flex-1 justify-center">Cancel</button>
          <button on:click={resetAllData} disabled={resetConfirmText !== 'RESET' || resetting}
            class="flex-1 justify-center flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors
              {resetConfirmText === 'RESET' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500/10 text-red-500/50 cursor-not-allowed'}">
            <Trash2 size={15} />
            {resetting ? 'Deleting...' : 'Reset All Data'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Employee Modal -->
{#if deleteModal.show && deleteModal.employee}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div class="bg-modal border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md">
      <div class="flex items-center justify-between p-6 border-b border-red-500/20">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-red-500/15 rounded-full flex items-center justify-center">
            <Trash2 size={18} class="text-red-600 dark:text-red-400" />
          </div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Delete Employee</h2>
        </div>
        <button on:click={() => deleteModal = { show: false, employee: null }} class="p-2 hover:bg-[var(--color-subtle)] rounded-lg text-gray-500 dark:text-gray-400"><X size={18} /></button>
      </div>
      <div class="p-6 space-y-4">
        <div class="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-600 dark:text-red-400 space-y-1">
          <p class="font-semibold">
            {deleteModal.employee.name} ({deleteModal.employee.employeeCode}) permanently delete ho jayega. Yeh action undo nahi ho sakti:
          </p>
          <ul class="list-disc pl-4 space-y-0.5 mt-1">
            <li>Employee ka account delete ho jayega</li>
            <li>Unka saara attendance history delete ho jayega</li>
            <li>Unki saari leaves aur leave balance delete ho jayengi</li>
          </ul>
        </div>
        <div>
          <label for="delete-confirm" class="label">Confirm karne ke liye <span class="font-mono font-bold text-red-500">DELETE</span> type karein</label>
          <input id="delete-confirm" bind:value={deleteConfirmText} class="input" placeholder="DELETE" autocomplete="off" />
        </div>
        {#if deleteError}
          <p class="text-sm text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{deleteError}</p>
        {/if}
        <div class="flex gap-3 pt-1">
          <button on:click={() => deleteModal = { show: false, employee: null }} class="btn-secondary flex-1 justify-center">Cancel</button>
          <button on:click={confirmDeleteEmployee} disabled={deleteConfirmText !== 'DELETE' || deleting}
            class="flex-1 justify-center flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors
              {deleteConfirmText === 'DELETE' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500/10 text-red-500/50 cursor-not-allowed'}">
            <Trash2 size={15} />
            {deleting ? 'Deleting...' : 'Delete Employee'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- View Employee Modal -->
{#if viewEmployee}
  <div class="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
    <div class="bg-modal border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-2xl my-4">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
        <div class="flex items-center gap-3">
          <AvatarUpload
            employeeId={viewEmployee.id}
            name={viewEmployee.name}
            avatar={viewEmployee.avatar}
            size="md"
            on:change={e => {
              viewEmployee = { ...viewEmployee, avatar: e.detail }
              employees = employees.map(emp => emp.id === viewEmployee.id ? { ...emp, avatar: e.detail } : emp)
              if ($currentUser?.id === viewEmployee.id) authStore.updateUser({ avatar: e.detail })
            }}
          />
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{viewEmployee.name}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">{viewEmployee.employeeCode} · {viewEmployee.department || 'N/A'}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          {#if !editMode}
            <button on:click={openAdminPassModal}
              class="btn-secondary text-sm py-1.5 px-3 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 border-amber-500/30">
              <Eye size={14} /> Password
            </button>
            <button on:click={enterEdit}
              class="btn-secondary text-sm py-1.5 px-3">Edit</button>
          {/if}
          <button on:click={() => { viewEmployee = null; editMode = false }} class="p-2 hover:bg-[var(--color-subtle)] rounded-lg text-gray-500 dark:text-gray-400"><X size={18} /></button>
        </div>
      </div>

      <div class="p-6 space-y-5">
        {#if editMode}
          <!-- ── Edit Form ── -->
          <div class="space-y-4">
            <div class="grid sm:grid-cols-2 gap-3">
              <div>
                <label class="label">Full Name *</label>
                <input bind:value={editForm.name} class="input" placeholder="John Doe" />
              </div>
              <div>
                <label class="label">Employee Code *</label>
                <input bind:value={editForm.employeeCode} class="input" placeholder="CT-004" />
              </div>
              <div>
                <label class="label">Email *</label>
                <input type="email" bind:value={editForm.email} class="input" />
              </div>
              <div>
                <label class="label">Phone</label>
                <input bind:value={editForm.phone} class="input" placeholder="9876543210" />
              </div>
              <div>
                <label class="label">Department</label>
                <input bind:value={editForm.department} class="input" placeholder="Engineering" />
              </div>
              <div>
                <label class="label">Designation</label>
                <input bind:value={editForm.designation} class="input" placeholder="Software Engineer" />
              </div>
              <div>
                <label class="label">Role</label>
                <select bind:value={editForm.role} class="input">
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label class="label">Join Date</label>
                <input type="date" bind:value={editForm.joinDate} class="input" />
              </div>
              <div class="col-span-2">
                <label class="label">New Password <span class="text-gray-400 dark:text-gray-500 font-normal">(khali chhodo agar change nahi karna)</span></label>
                <div class="relative">
                  <input type={editShowPass ? 'text' : 'password'} bind:value={editForm.password}
                    class="input pr-10" placeholder="Min 8 characters" />
                  <button type="button" on:click={() => editShowPass = !editShowPass}
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                    <Eye size={15} />
                  </button>
                </div>
              </div>
            </div>
            {#if editError}
              <div class="text-sm text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{editError}</div>
            {/if}
            <div class="flex gap-3">
              <button on:click={() => editMode = false} class="btn-secondary flex-1 justify-center">Cancel</button>
              <button on:click={saveEdit} disabled={editSaving} class="btn-primary flex-1 justify-center">
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        {:else}
          <!-- ── Info grid (view mode) ── -->
          <div class="grid sm:grid-cols-2 gap-3 text-sm">
            {#each [
              { label: 'Email', value: viewEmployee.email },
              { label: 'Phone', value: viewEmployee.phone || '-' },
              { label: 'Designation', value: viewEmployee.designation || '-' },
              { label: 'Join Date', value: formatDate(viewEmployee.joinDate) },
              { label: 'Role', value: viewEmployee.role },
              { label: 'Status', value: viewEmployee.isActive ? 'Active' : 'Inactive' },
            ] as info}
              <div class="bg-[var(--color-faint)] rounded-lg p-3">
                <p class="text-xs text-gray-400 dark:text-gray-500">{info.label}</p>
                <p class="font-medium text-gray-900 dark:text-gray-100 mt-0.5">{info.value}</p>
              </div>
            {/each}
          </div>
        {/if}

        <!-- ── Leave Balance Editor ── -->
        <div class="border border-[var(--color-border)] rounded-xl overflow-hidden">
          <div class="bg-[var(--color-faint)] px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Leave Allocation (This Year)</h3>
            {#if empLeaveBalance}
              <span class="text-xs text-gray-400 dark:text-gray-500">Used / Allocated</span>
            {/if}
          </div>
          <div class="p-4 space-y-3">
            <div class="grid sm:grid-cols-2 gap-3">
              {#each [
                { key: 'sickLeave', label: 'Sick Leave', used: empLeaveBalance?.sickUsed ?? 0, color: 'red' },
                { key: 'casualLeave', label: 'Casual Leave', used: empLeaveBalance?.casualUsed ?? 0, color: 'blue' },
                { key: 'earnedLeave', label: 'Earned Leave', used: empLeaveBalance?.earnedUsed ?? 0, color: 'green' },
                { key: 'wfhLeave', label: 'Work From Home', used: empLeaveBalance?.wfhUsed ?? 0, color: 'purple' },
              ] as lb}
                <div class="bg-[var(--color-faint)] rounded-lg p-3">
                  <div class="flex items-center justify-between mb-2">
                    <label for="lb-{lb.key}" class="text-xs font-medium text-gray-500 dark:text-gray-400">{lb.label}</label>
                    <span class="text-xs text-gray-400 dark:text-gray-500">{lb.used} used</span>
                  </div>
                  <input id="lb-{lb.key}" type="number" min="0" max="365"
                    bind:value={leaveForm[lb.key]}
                    class="input py-1.5 text-sm text-center font-semibold" />
                  <div class="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
                    {leaveForm[lb.key] - lb.used} remaining
                  </div>
                </div>
              {/each}
            </div>
            {#if leaveError}
              <p class="text-xs text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{leaveError}</p>
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

        <!-- This month attendance (only in view mode) -->
        {#if !editMode}
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200">This Month Attendance</h3>
            <button on:click={() => showExportRangeModal = true}
              class="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1.5">
              <Download size={12} /> Export CSV
            </button>
          </div>
          <div class="overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table class="w-full text-xs">
              <thead class="bg-[var(--color-faint)]">
                <tr>
                  {#each ['Date', 'In', 'Out', 'Hours', 'Status'] as h}
                    <th class="px-3 py-2 text-left text-gray-400 dark:text-gray-500 font-semibold uppercase">{h}</th>
                  {/each}
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--color-divide)]">
                {#each displayAttendance.slice(0, 8) as rec}
                  {@const badge = getStatusBadge(rec.status)}
                  <tr>
                    <td class="px-3 py-2 text-gray-600 dark:text-gray-300">{new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                    <td class="px-3 py-2 text-gray-500 dark:text-gray-400">{formatTime(rec.punchIn)}</td>
                    <td class="px-3 py-2 text-gray-500 dark:text-gray-400">{formatTime(rec.punchOut)}</td>
                    <td class="px-3 py-2 text-gray-500 dark:text-gray-400">{rec.workingHours ? formatHours(rec.workingHours) : '-'}</td>
                    <td class="px-3 py-2"><span class="{badge.class}">{badge.label}</span></td>
                  </tr>
                {:else}
                  <tr><td colspan="5" class="px-3 py-4 text-center text-gray-400 dark:text-gray-500">No records this month</td></tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Export Attendance Date Range Modal -->
{#if showExportRangeModal && viewEmployee}
  <DateRangeModal
    title="Export {viewEmployee.name}'s Attendance"
    loading={exportRangeLoading}
    onConfirm={exportEmployeeCSVRange}
    onClose={() => showExportRangeModal = false}
  />
{/if}

<!-- Admin Reset Employee Password Modal -->
{#if showAdminPassModal && viewEmployee}
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
    <div class="bg-modal border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-sm">
      <div class="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
        <div>
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Reset Password</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{viewEmployee.name} ({viewEmployee.employeeCode})</p>
        </div>
        <button on:click={() => showAdminPassModal = false} class="p-1.5 hover:bg-[var(--color-subtle)] rounded-lg text-gray-500 dark:text-gray-400"><X size={17} /></button>
      </div>

      {#if adminPassSuccess}
        <div class="p-8 text-center">
          <div class="w-12 h-12 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          </div>
          <p class="font-semibold text-gray-900 dark:text-gray-100">Password reset ho gaya!</p>
        </div>
      {:else}
        <div class="p-5 space-y-4">
          <div>
            <label class="label" for="ap-new">New Password</label>
            <div class="relative">
              <input id="ap-new" type={adminPassShow ? 'text' : 'password'}
                bind:value={adminPassForm.password} class="input pr-10" placeholder="Min 8 characters" />
              <button type="button" on:click={() => adminPassShow = !adminPassShow}
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                {#if adminPassShow}<EyeOff size={15} />{:else}<Eye size={15} />{/if}
              </button>
            </div>
          </div>
          <div>
            <label class="label" for="ap-confirm">Confirm Password</label>
            <input id="ap-confirm" type="password"
              bind:value={adminPassForm.confirm} class="input" placeholder="Repeat new password" />
          </div>
          {#if adminPassError}
            <p class="text-sm text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{adminPassError}</p>
          {/if}
          <div class="flex gap-3 pt-1">
            <button on:click={() => showAdminPassModal = false} class="btn-secondary flex-1 justify-center">Cancel</button>
            <button on:click={saveAdminPassword} disabled={adminPassSaving} class="btn-primary flex-1 justify-center">
              {adminPassSaving ? 'Saving...' : 'Reset Password'}
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
