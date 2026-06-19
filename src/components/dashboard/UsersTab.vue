<script setup lang="ts">
import { ref } from 'vue'
import { db, app } from '../../firebase'
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'

interface UserProfile {
  uid: string
  fullName: string
  email: string
  role: string
  status: string
  createdAt: string
  isMock: boolean
  phoneNumber?: string
  address?: string
}

const props = defineProps<{
  users: UserProfile[]
  loading: boolean
  currentUserId: string
}>()

const emit = defineEmits<{
  (e: 'update-display-name', name: string): void
}>()

// States
const mutating = ref(false)

// Edit states
const showEditModal = ref(false)
const editingUser = ref<UserProfile | null>(null)
const editForm = ref({ fullName: '', role: 'Karyawan', status: 'Aktif', phoneNumber: '', address: '' })

// Delete states
const showDeleteModal = ref(false)
const deletingUser = ref<UserProfile | null>(null)

// Add states
const showAddModal = ref(false)
const addError = ref('')
const addForm = ref({
  fullName: '',
  email: '',
  phoneNumber: '',
  address: '',
  password: '',
  role: 'Karyawan',
  status: 'Aktif'
})

const resettingAddForm = () => {
  addForm.value = {
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    password: '',
    role: 'Karyawan',
    status: 'Aktif'
  }
  addError.value = ''
}

// Handlers
const openEditModal = (user: UserProfile) => {
  editingUser.value = user
  editForm.value = {
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    phoneNumber: user.phoneNumber || '',
    address: user.address || ''
  }
  showEditModal.value = true
}

const saveEdit = async () => {
  if (!editingUser.value) return
  mutating.value = true
  try {
    const userRef = doc(db, 'users', editingUser.value.uid)
    await setDoc(userRef, {
      fullName: editForm.value.fullName,
      role: editForm.value.role,
      status: editForm.value.status,
      phoneNumber: editForm.value.phoneNumber,
      address: editForm.value.address,
      email: editingUser.value.email,
      createdAt: editingUser.value.createdAt
    }, { merge: true })
    
    if (editingUser.value.uid === props.currentUserId) {
      emit('update-display-name', editForm.value.fullName)
    }
    
    showEditModal.value = false
    editingUser.value = null
  } catch (error) {
    console.error('Error saving user edit:', error)
    alert('Gagal mengubah data pengguna.')
  } finally {
    mutating.value = false
  }
}

const openDeleteModal = (user: UserProfile) => {
  deletingUser.value = user
  showDeleteModal.value = true
}

const executeDelete = async () => {
  if (!deletingUser.value) return
  mutating.value = true
  try {
    await deleteDoc(doc(db, 'users', deletingUser.value.uid))
    showDeleteModal.value = false
    deletingUser.value = null
  } catch (error) {
    console.error('Error deleting user:', error)
    alert('Gagal menghapus pengguna.')
  } finally {
    mutating.value = false
  }
}

const saveAdd = async () => {
  mutating.value = true
  addError.value = ''
  try {
    const apps = getApps()
    const secondaryApp = apps.find(a => a.name === 'Secondary') || initializeApp(app.options, 'Secondary')
    const secondaryAuth = getAuth(secondaryApp)
    
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      addForm.value.email,
      addForm.value.password
    )
    
    if (userCredential.user) {
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        fullName: addForm.value.fullName,
        email: addForm.value.email,
        phoneNumber: addForm.value.phoneNumber,
        address: addForm.value.address,
        role: addForm.value.role,
        status: addForm.value.status,
        createdAt: serverTimestamp()
      })
    }
    
    await secondaryAuth.signOut()
    showAddModal.value = false
    resettingAddForm()
  } catch (error: any) {
    console.error('Error adding user:', error)
    if (error.code === 'auth/email-already-in-use') {
      addError.value = 'Email sudah terdaftar.'
    } else if (error.code === 'auth/weak-password') {
      addError.value = 'Kata sandi minimal 6 karakter.'
    } else if (error.code === 'auth/invalid-email') {
      addError.value = 'Format email tidak valid.'
    } else {
      addError.value = error.message || 'Gagal menambahkan pengguna.'
    }
  } finally {
    mutating.value = false
  }
}
</script>

<template>
  <div class="space-y-6 justify-start mt-0">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-white tracking-tight">Daftar Pengguna</h2>
        <p class="text-sm text-slate-400 mt-1">Kelola akun pengguna dan hak akses sistem ERP.</p>
      </div>
      <div>
        <button
          @click="showAddModal = true; resettingAddForm()"
          class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Tambah User
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64 bg-slate-900/20 border border-slate-800 rounded-2xl">
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Memuat data pengguna...</p>
      </div>
    </div>

    <!-- Users Table Card -->
    <div v-else class="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800/80 bg-slate-900/60 text-slate-300 text-xs font-semibold uppercase tracking-wider">
              <th class="py-4 px-6">Nama Pengguna</th>
              <th class="py-4 px-6">Alamat Email</th>
              <th class="py-4 px-6">No Telepon</th>
              <th class="py-4 px-6">Alamat</th>
              <th class="py-4 px-6">Peran (Role)</th>
              <th class="py-4 px-6">Status</th>
              <th class="py-4 px-6">Tanggal Bergabung</th>
              <th class="py-4 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/50 text-sm text-slate-300">
            <tr 
              v-for="user in users" 
              :key="user.email"
              class="hover:bg-slate-800/20 transition-colors"
            >
              <!-- User Name & Avatar -->
              <td class="py-4 px-6 flex items-center gap-3">
                <div class="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-purple-400 uppercase">
                  {{ user.fullName.charAt(0) }}
                </div>
                <span class="font-medium text-white">{{ user.fullName }}</span>
              </td>
              <!-- Email -->
              <td class="py-4 px-6 text-slate-400">
                {{ user.email }}
              </td>
              <!-- No Telepon -->
              <td class="py-4 px-6 text-slate-400">
                {{ user.phoneNumber }}
              </td>
              <!-- Alamat -->
              <td class="py-4 px-6 text-slate-400 max-w-xs truncate" :title="user.address">
                {{ user.address }}
              </td>
              <!-- Role -->
              <td class="py-4 px-6">
                <span 
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  :class="user.role === 'Administrator' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'"
                >
                  {{ user.role }}
                </span>
              </td>
              <!-- Status -->
              <td class="py-4 px-6">
                <span 
                  class="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border"
                  :class="user.status === 'Aktif' ? 'text-green-400 bg-green-500/10 border-green-500/10' : 'text-slate-400 bg-slate-500/10 border-slate-500/10'"
                >
                  <span class="h-1.5 w-1.5 rounded-full" :class="user.status === 'Aktif' ? 'bg-green-400' : 'bg-slate-400'"></span>
                  {{ user.status }}
                </span>
              </td>
              <!-- Joined Date -->
              <td class="py-4 px-6 text-slate-400">
                {{ user.createdAt }}
              </td>
              <!-- Actions -->
              <td class="py-4 px-6 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button 
                    @click="openEditModal(user)"
                    class="p-2 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-all cursor-pointer"
                    title="Edit Pengguna"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    @click="openDeleteModal(user)"
                    class="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-all cursor-pointer"
                    title="Hapus Pengguna"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showEditModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-4">Edit Profil Pengguna</h3>
        <form @submit.prevent="saveEdit" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap</label>
            <input 
              v-model="editForm.fullName" 
              type="text" 
              required
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">No Telepon</label>
            <input 
              v-model="editForm.phoneNumber" 
              type="tel" 
              required
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Alamat</label>
            <input 
              v-model="editForm.address" 
              type="text" 
              required
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Peran (Role)</label>
            <select 
              v-model="editForm.role"
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
            >
              <option value="Administrator">Administrator</option>
              <option value="Karyawan">Karyawan</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Status</label>
            <select 
              v-model="editForm.status"
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
            >
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button 
              type="button" 
              @click="showEditModal = false"
              class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button 
              type="submit" 
              :disabled="mutating"
              class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50"
            >
              {{ mutating ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete User Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showDeleteModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-2">Hapus Pengguna</h3>
        <p class="text-sm text-slate-400 mb-6">
          Apakah Anda yakin ingin menghapus pengguna <span class="text-white font-semibold">{{ deletingUser?.fullName }}</span>? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div class="flex items-center justify-end gap-3">
          <button 
            type="button" 
            @click="showDeleteModal = false"
            class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer"
          >
            Batal
          </button>
          <button 
            type="button" 
            @click="executeDelete"
            :disabled="mutating"
            class="px-4 py-2 bg-red-600 hover:bg-red-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all cursor-pointer disabled:opacity-50"
          >
            {{ mutating ? 'Menghapus...' : 'Hapus Pengguna' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Add User Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showAddModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-4">Tambah Pengguna Baru</h3>
        <form @submit.prevent="saveAdd" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap</label>
            <input 
              v-model="addForm.fullName" 
              type="text" 
              required
              placeholder="Nama Lengkap"
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Alamat Email</label>
            <input 
              v-model="addForm.email" 
              type="email" 
              required
              placeholder="email@example.com"
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Kata Sandi</label>
            <input 
              v-model="addForm.password" 
              type="password" 
              required
              placeholder="Minimal 6 karakter"
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">No Telepon</label>
            <input 
              v-model="addForm.phoneNumber" 
              type="tel" 
              required
              placeholder="Contoh: 08123456789"
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Alamat</label>
            <input 
              v-model="addForm.address" 
              type="text" 
              required
              placeholder="Alamat Lengkap"
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Peran (Role)</label>
            <select 
              v-model="addForm.role"
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
            >
              <option value="Administrator">Administrator</option>
              <option value="Karyawan">Karyawan</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Status</label>
            <select 
              v-model="addForm.status"
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
            >
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>
          <div v-if="addError" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ addError }}
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button 
              type="button" 
              @click="showAddModal = false"
              class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button 
              type="submit" 
              :disabled="mutating"
              class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50"
            >
              {{ mutating ? 'Menyimpan...' : 'Simpan User' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
