<script setup lang="ts">
import { ref } from 'vue'
import { db } from '../../firebase'
import { doc, setDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore'

interface Supplier {
  id: string
  name: string
  address: string
  googleMap: string
  createdAt: string
}

defineProps<{
  suppliers: Supplier[]
  loading: boolean
}>()

// States
const mutating = ref(false)
const supplierError = ref('')

// Modal visibility states
const showAddSupplierModal = ref(false)
const showEditSupplierModal = ref(false)
const showDeleteSupplierModal = ref(false)

// Ref objects
const editingSupplier = ref<Supplier | null>(null)
const deletingSupplier = ref<Supplier | null>(null)

// Form data
const supplierForm = ref({
  name: '',
  address: '',
  googleMap: ''
})

const resetSupplierForm = () => {
  supplierForm.value = {
    name: '',
    address: '',
    googleMap: ''
  }
  supplierError.value = ''
}

// Handlers
const saveAddSupplier = async () => {
  mutating.value = true
  supplierError.value = ''
  try {
    const docRef = doc(collection(db, 'suppliyers'))
    await setDoc(docRef, {
      name: supplierForm.value.name,
      address: supplierForm.value.address,
      googleMap: supplierForm.value.googleMap,
      createdAt: serverTimestamp()
    })
    showAddSupplierModal.value = false
    resetSupplierForm()
  } catch (error: any) {
    console.error('Error adding supplier:', error)
    supplierError.value = error.message || 'Gagal menambahkan supplier.'
  } finally {
    mutating.value = false
  }
}

const openEditSupplier = (sup: Supplier) => {
  editingSupplier.value = sup
  supplierForm.value = {
    name: sup.name,
    address: sup.address,
    googleMap: sup.googleMap
  }
  showEditSupplierModal.value = true
}

const saveEditSupplier = async () => {
  if (!editingSupplier.value) return
  mutating.value = true
  supplierError.value = ''
  try {
    const docRef = doc(db, 'suppliyers', editingSupplier.value.id)
    await setDoc(docRef, {
      name: supplierForm.value.name,
      address: supplierForm.value.address,
      googleMap: supplierForm.value.googleMap
    }, { merge: true })
    showEditSupplierModal.value = false
    editingSupplier.value = null
    resetSupplierForm()
  } catch (error: any) {
    console.error('Error editing supplier:', error)
    supplierError.value = error.message || 'Gagal mengubah data supplier.'
  } finally {
    mutating.value = false
  }
}

const openDeleteSupplier = (sup: Supplier) => {
  deletingSupplier.value = sup
  showDeleteSupplierModal.value = true
}

const executeDeleteSupplier = async () => {
  if (!deletingSupplier.value) return
  mutating.value = true
  try {
    await deleteDoc(doc(db, 'suppliyers', deletingSupplier.value.id))
    showDeleteSupplierModal.value = false
    deletingSupplier.value = null
  } catch (error) {
    console.error('Error deleting supplier:', error)
    alert('Gagal menghapus supplier.')
  } finally {
    mutating.value = false
  }
}
</script>

<template>
  <div class="space-y-6 justify-start mt-0">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-white tracking-tight">Daftar Supplier (Suppliyer)</h2>
        <p class="text-sm text-slate-400 mt-1">Kelola data penyedia bahan baku dan lokasi supplier.</p>
      </div>
      <div>
        <button
          @click="showAddSupplierModal = true; resetSupplierForm()"
          class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Supplier
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64 bg-slate-900/20 border border-slate-800 rounded-2xl">
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Memuat data supplier...</p>
      </div>
    </div>

    <!-- Supplier Table Card -->
    <div v-else class="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800/80 bg-slate-900/60 text-slate-300 text-xs font-semibold uppercase tracking-wider">
              <th class="py-4 px-6">Nama Supplier</th>
              <th class="py-4 px-6">Alamat</th>
              <th class="py-4 px-6">Google Map</th>
              <th class="py-4 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/50 text-sm text-slate-300">
            <tr 
              v-for="sup in suppliers" 
              :key="sup.id"
              class="hover:bg-slate-800/20 transition-colors"
            >
              <td class="py-4 px-6 font-medium text-white">{{ sup.name }}</td>
              <td class="py-4 px-6 text-slate-400">{{ sup.address }}</td>
              <td class="py-4 px-6">
                <a 
                  v-if="sup.googleMap"
                  :href="sup.googleMap" 
                  target="_blank" 
                  class="text-purple-400 hover:text-purple-300 hover:underline inline-flex items-center gap-1"
                >
                  <span>Lihat Peta</span>
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <span v-else class="text-slate-500">-</span>
              </td>
              <td class="py-4 px-6 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button 
                    @click="openEditSupplier(sup)"
                    class="p-2 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-all cursor-pointer"
                    title="Edit Supplier"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    @click="openDeleteSupplier(sup)"
                    class="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-all cursor-pointer"
                    title="Hapus Supplier"
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

    <!-- Add Supplier Modal -->
    <div v-if="showAddSupplierModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showAddSupplierModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-4">Tambah Supplier Baru</h3>
        <form @submit.prevent="saveAddSupplier" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nama Supplier</label>
            <input v-model="supplierForm.name" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" placeholder="Nama Supplier" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Alamat</label>
            <input v-model="supplierForm.address" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" placeholder="Alamat Lengkap" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Google Map (Link URL)</label>
            <input v-model="supplierForm.googleMap" type="url" class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" placeholder="https://maps.google.com/..." />
          </div>
          <div v-if="supplierError" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ supplierError }}
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" @click="showAddSupplierModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
            <button type="submit" :disabled="mutating" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50">
              {{ mutating ? 'Menyimpan...' : 'Simpan Supplier' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Supplier Modal -->
    <div v-if="showEditSupplierModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showEditSupplierModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-4">Edit Data Supplier</h3>
        <form @submit.prevent="saveEditSupplier" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nama Supplier</label>
            <input v-model="supplierForm.name" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Alamat</label>
            <input v-model="supplierForm.address" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Google Map (Link URL)</label>
            <input v-model="supplierForm.googleMap" type="url" class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
          </div>
          <div v-if="supplierError" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ supplierError }}
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" @click="showEditSupplierModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
            <button type="submit" :disabled="mutating" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50">
              {{ mutating ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Supplier Modal -->
    <div v-if="showDeleteSupplierModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showDeleteSupplierModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-2">Hapus Supplier</h3>
        <p class="text-sm text-slate-400 mb-6">
          Apakah Anda yakin ingin menghapus supplier <span class="text-white font-semibold">{{ deletingSupplier?.name }}</span>? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div class="flex items-center justify-end gap-3">
          <button type="button" @click="showDeleteSupplierModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
          <button type="button" @click="executeDeleteSupplier" :disabled="mutating" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all cursor-pointer disabled:opacity-50">
            {{ mutating ? 'Menghapus...' : 'Hapus Supplier' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
