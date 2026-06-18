<script setup lang="ts">
import { ref } from 'vue'
import { db } from '../../firebase'
import { doc, setDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore'

interface PackagingOption {
  id: string
  name: string
  createdAt: string
}

defineProps<{
  packagingOptions: PackagingOption[]
  loading: boolean
}>()

// States
const mutating = ref(false)
const packagingError = ref('')

// Modals
const showAddPackagingModal = ref(false)
const showEditPackagingModal = ref(false)
const showDeletePackagingModal = ref(false)

const editingPackaging = ref<PackagingOption | null>(null)
const deletingPackaging = ref<PackagingOption | null>(null)

const packagingForm = ref({
  name: ''
})

const resetPackagingForm = () => {
  packagingForm.value = {
    name: ''
  }
  packagingError.value = ''
}

// Handlers
const saveAddPackaging = async () => {
  mutating.value = true
  packagingError.value = ''
  try {
    const docRef = doc(collection(db, 'kemasan'))
    await setDoc(docRef, {
      name: packagingForm.value.name,
      createdAt: serverTimestamp()
    })
    showAddPackagingModal.value = false
    resetPackagingForm()
  } catch (error: any) {
    console.error('Error adding packaging:', error)
    packagingError.value = error.message || 'Gagal menambahkan kemasan.'
  } finally {
    mutating.value = false
  }
}

const openEditPackaging = (pkg: PackagingOption) => {
  editingPackaging.value = pkg
  packagingForm.value = {
    name: pkg.name
  }
  showEditPackagingModal.value = true
}

const saveEditPackaging = async () => {
  if (!editingPackaging.value) return
  mutating.value = true
  packagingError.value = ''
  try {
    const docRef = doc(db, 'kemasan', editingPackaging.value.id)
    await setDoc(docRef, {
      name: packagingForm.value.name
    }, { merge: true })
    showEditPackagingModal.value = false
    editingPackaging.value = null
    resetPackagingForm()
  } catch (error: any) {
    console.error('Error editing packaging:', error)
    packagingError.value = error.message || 'Gagal mengubah data kemasan.'
  } finally {
    mutating.value = false
  }
}

const openDeletePackaging = (pkg: PackagingOption) => {
  deletingPackaging.value = pkg
  showDeletePackagingModal.value = true
}

const executeDeletePackaging = async () => {
  if (!deletingPackaging.value) return
  mutating.value = true
  try {
    await deleteDoc(doc(db, 'kemasan', deletingPackaging.value.id))
    showDeletePackagingModal.value = false
    deletingPackaging.value = null
  } catch (error) {
    console.error('Error deleting packaging:', error)
    alert('Gagal menghapus kemasan.')
  } finally {
    mutating.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-white tracking-tight">Daftar Satuan</h2>
        <p class="text-sm text-slate-400 mt-1">Kelola daftar satuan untuk bahan baku.</p>
      </div>
      <div>
        <button
          @click="showAddPackagingModal = true; resetPackagingForm()"
          class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Satuan
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64 bg-slate-900/20 border border-slate-800 rounded-2xl">
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Memuat daftar satuan...</p>
      </div>
    </div>

    <!-- Packaging Table Card -->
    <div v-else class="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800/80 bg-slate-900/60 text-slate-300 text-xs font-semibold uppercase tracking-wider">
              <th class="py-4 px-6">Nama Satuan</th>
              <th class="py-4 px-6">Tanggal Ditambahkan</th>
              <th class="py-4 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/50 text-sm text-slate-300">
            <tr 
              v-for="pkg in packagingOptions" 
              :key="pkg.id"
              class="hover:bg-slate-800/20 transition-colors"
            >
              <td class="py-4 px-6 font-medium text-white">{{ pkg.name }}</td>
              <td class="py-4 px-6 text-slate-400">{{ pkg.createdAt }}</td>
              <td class="py-4 px-6 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button 
                    @click="openEditPackaging(pkg)"
                    class="p-2 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-all cursor-pointer"
                    title="Edit Satuan"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    @click="openDeletePackaging(pkg)"
                    class="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-all cursor-pointer"
                    title="Hapus Satuan"
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

    <!-- Add Packaging Modal -->
    <div v-if="showAddPackagingModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showAddPackagingModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-4">Tambah Satuan Baru</h3>
        <form @submit.prevent="saveAddPackaging" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nama Satuan</label>
            <input v-model="packagingForm.name" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" placeholder="Nama Satuan (cth: Kg, Liter, Pcs)" />
          </div>
          <div v-if="packagingError" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ packagingError }}
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" @click="showAddPackagingModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
            <button type="submit" :disabled="mutating" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50">
              {{ mutating ? 'Menyimpan...' : 'Simpan Satuan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Packaging Modal -->
    <div v-if="showEditPackagingModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showEditPackagingModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-4">Edit Nama Satuan</h3>
        <form @submit.prevent="saveEditPackaging" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nama Satuan</label>
            <input v-model="packagingForm.name" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
          </div>
          <div v-if="packagingError" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ packagingError }}
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" @click="showEditPackagingModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
            <button type="submit" :disabled="mutating" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50">
              {{ mutating ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Packaging Modal -->
    <div v-if="showDeletePackagingModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showDeletePackagingModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-2">Hapus Satuan</h3>
        <p class="text-sm text-slate-400 mb-6">
          Apakah Anda yakin ingin menghapus satuan <span class="text-white font-semibold">{{ deletingPackaging?.name }}</span>? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div class="flex items-center justify-end gap-3">
          <button type="button" @click="showDeletePackagingModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
          <button type="button" @click="executeDeletePackaging" :disabled="mutating" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all cursor-pointer disabled:opacity-50">
            {{ mutating ? 'Menghapus...' : 'Hapus Satuan' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
