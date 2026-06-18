<script setup lang="ts">
import { ref, computed } from 'vue'
import { db } from '../../firebase'
import { doc, setDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore'

interface RawMaterial {
  id: string
  name: string
  packaging: string
  weight: number
  createdAt: string
}

interface PackagingOption {
  id: string
  name: string
  createdAt: string
}

const props = defineProps<{
  rawMaterials: RawMaterial[]
  packagingOptions: PackagingOption[]
  loading: boolean
}>()

// States
const mutating = ref(false)
const materialError = ref('')
const searchMaterialQuery = ref('')

// Modals
const showAddMaterialModal = ref(false)
const showEditMaterialModal = ref(false)
const showDeleteMaterialModal = ref(false)

const editingMaterial = ref<RawMaterial | null>(null)
const deletingMaterial = ref<RawMaterial | null>(null)

const materialForm = ref({
  name: '',
  packaging: '',
  weight: 0
})

const resetMaterialForm = () => {
  materialForm.value = {
    name: '',
    packaging: '',
    weight: 0
  }
  materialError.value = ''
}

// Local computed filter and sort
const filteredAndSortedRawMaterials = computed(() => {
  let result = props.rawMaterials
  if (searchMaterialQuery.value.trim()) {
    const query = searchMaterialQuery.value.toLowerCase()
    result = result.filter(mat => mat.name.toLowerCase().includes(query))
  }
  return result.slice().sort((a, b) => a.name.localeCompare(b.name))
})

// Handlers
const saveAddMaterial = async () => {
  mutating.value = true
  materialError.value = ''
  try {
    const docRef = doc(collection(db, 'bahan_baku'))
    await setDoc(docRef, {
      name: materialForm.value.name,
      packaging: materialForm.value.packaging,
      weight: Number(materialForm.value.weight) || 0,
      createdAt: serverTimestamp()
    })
    showAddMaterialModal.value = false
    resetMaterialForm()
  } catch (error: any) {
    console.error('Error adding raw material:', error)
    materialError.value = error.message || 'Gagal menambahkan bahan baku.'
  } finally {
    mutating.value = false
  }
}

const openEditMaterial = (material: RawMaterial) => {
  editingMaterial.value = material
  materialForm.value = {
    name: material.name,
    packaging: material.packaging,
    weight: material.weight
  }
  showEditMaterialModal.value = true
}

const saveEditMaterial = async () => {
  if (!editingMaterial.value) return
  mutating.value = true
  materialError.value = ''
  try {
    const docRef = doc(db, 'bahan_baku', editingMaterial.value.id)
    await setDoc(docRef, {
      name: materialForm.value.name,
      packaging: materialForm.value.packaging,
      weight: Number(materialForm.value.weight) || 0
    }, { merge: true })
    showEditMaterialModal.value = false
    editingMaterial.value = null
    resetMaterialForm()
  } catch (error: any) {
    console.error('Error editing raw material:', error)
    materialError.value = error.message || 'Gagal mengubah bahan baku.'
  } finally {
    mutating.value = false
  }
}

const openDeleteMaterial = (material: RawMaterial) => {
  deletingMaterial.value = material
  showDeleteMaterialModal.value = true
}

const executeDeleteMaterial = async () => {
  if (!deletingMaterial.value) return
  mutating.value = true
  try {
    await deleteDoc(doc(db, 'bahan_baku', deletingMaterial.value.id))
    showDeleteMaterialModal.value = false
    deletingMaterial.value = null
  } catch (error) {
    console.error('Error deleting raw material:', error)
    alert('Gagal menghapus bahan baku.')
  } finally {
    mutating.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-white tracking-tight">Daftar Bahan Baku</h2>
        <p class="text-sm text-slate-400 mt-1">Kelola data bahan baku produksi, kemasan, dan berat.</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="relative">
          <input 
            v-model="searchMaterialQuery"
            type="text"
            placeholder="Cari Nama Bahan..."
            class="w-full sm:w-64 px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          >
          <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg class="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <button
          @click="showAddMaterialModal = true; resetMaterialForm()"
          class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Bahan Baku
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64 bg-slate-900/20 border border-slate-800 rounded-2xl">
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Memuat bahan baku...</p>
      </div>
    </div>

    <!-- Raw Materials Table Card -->
    <div v-else class="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800/80 bg-slate-900/60 text-slate-300 text-xs font-semibold uppercase tracking-wider">
              <th class="py-4 px-6">Nama Bahan</th>
              <th class="py-4 px-6">Kemasan</th>
              <th class="py-4 px-6">Berat (Kg)</th>
              <th class="py-4 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/50 text-sm text-slate-300">
            <tr 
              v-for="mat in filteredAndSortedRawMaterials" 
              :key="mat.id"
              class="hover:bg-slate-800/20 transition-colors"
            >
              <td class="py-4 px-6 font-medium text-white">{{ mat.name }}</td>
              <td class="py-4 px-6 text-slate-400">{{ mat.packaging }}</td>
              <td class="py-4 px-6 text-slate-400 font-semibold">{{ mat.weight }} {{ mat.packaging && mat.packaging.toLowerCase() === 'ltr' ? 'Liter' : (mat.packaging && mat.packaging.toLowerCase() === 'lbr' ? 'Lbr' : 'Kg') }}</td>
              <td class="py-4 px-6 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button 
                    @click="openEditMaterial(mat)"
                    class="p-2 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-all cursor-pointer"
                    title="Edit Bahan Baku"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    @click="openDeleteMaterial(mat)"
                    class="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-all cursor-pointer"
                    title="Hapus Bahan Baku"
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

    <!-- Add Raw Material Modal -->
    <div v-if="showAddMaterialModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showAddMaterialModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-4">Tambah Bahan Baku Baru</h3>
        <form @submit.prevent="saveAddMaterial" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nama Bahan</label>
            <input v-model="materialForm.name" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" placeholder="Nama Bahan Baku" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Kemasan</label>
            <select v-model="materialForm.packaging" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm">
              <option value="" disabled>Pilih Kemasan</option>
              <option v-for="pkg in packagingOptions" :key="pkg.id" :value="pkg.name">{{ pkg.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              {{ materialForm.packaging && materialForm.packaging.toLowerCase() === 'ltr' ? 'Volume (Liter)' : (materialForm.packaging && materialForm.packaging.toLowerCase() === 'lbr' ? 'Jumlah (Lbr)' : 'Berat (Kg)') }}
            </label>
            <input v-model.number="materialForm.weight" type="number" step="any" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" :placeholder="materialForm.packaging && materialForm.packaging.toLowerCase() === 'ltr' ? 'Volume dalam Liter' : (materialForm.packaging && materialForm.packaging.toLowerCase() === 'lbr' ? 'Jumlah dalam Lbr' : 'Berat dalam Kg')" />
          </div>
          <div v-if="materialError" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ materialError }}
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" @click="showAddMaterialModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
            <button type="submit" :disabled="mutating" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50">
              {{ mutating ? 'Menyimpan...' : 'Simpan Bahan Baku' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Raw Material Modal -->
    <div v-if="showEditMaterialModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showEditMaterialModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-4">Edit Data Bahan Baku</h3>
        <form @submit.prevent="saveEditMaterial" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nama Bahan</label>
            <input v-model="materialForm.name" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Kemasan</label>
            <select v-model="materialForm.packaging" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm">
              <option value="" disabled>Pilih Kemasan</option>
              <option v-for="pkg in packagingOptions" :key="pkg.id" :value="pkg.name">{{ pkg.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              {{ materialForm.packaging && materialForm.packaging.toLowerCase() === 'ltr' ? 'Volume (Liter)' : (materialForm.packaging && materialForm.packaging.toLowerCase() === 'lbr' ? 'Jumlah (Lbr)' : 'Berat (Kg)') }}
            </label>
            <input v-model.number="materialForm.weight" type="number" step="any" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" :placeholder="materialForm.packaging && materialForm.packaging.toLowerCase() === 'ltr' ? 'Volume dalam Liter' : (materialForm.packaging && materialForm.packaging.toLowerCase() === 'lbr' ? 'Jumlah dalam Lbr' : 'Berat dalam Kg')" />
          </div>
          <div v-if="materialError" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ materialError }}
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" @click="showEditMaterialModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
            <button type="submit" :disabled="mutating" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50">
              {{ mutating ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Raw Material Modal -->
    <div v-if="showDeleteMaterialModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showDeleteMaterialModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-2">Hapus Bahan Baku</h3>
        <p class="text-sm text-slate-400 mb-6">
          Apakah Anda yakin ingin menghapus bahan baku <span class="text-white font-semibold">{{ deletingMaterial?.name }}</span>? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div class="flex items-center justify-end gap-3">
          <button type="button" @click="showDeleteMaterialModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
          <button type="button" @click="executeDeleteMaterial" :disabled="mutating" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all cursor-pointer disabled:opacity-50">
            {{ mutating ? 'Menghapus...' : 'Hapus Bahan Baku' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
