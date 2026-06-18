<script setup lang="ts">
import { ref } from 'vue'
import { db } from '../../firebase'
import { doc, setDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore'

interface SupplierMaterial {
  id: string
  supplierId: string
  supplierName: string
  materialId: string
  materialName: string
  materialPackaging: string
  materialWeight: number
  price: number
  createdAt: string
}

interface Supplier {
  id: string
  name: string
  address: string
  googleMap: string
  createdAt: string
}

interface RawMaterial {
  id: string
  name: string
  packaging: string
  weight: number
  createdAt: string
}

const props = defineProps<{
  supplierMaterials: SupplierMaterial[]
  suppliers: Supplier[]
  rawMaterials: RawMaterial[]
  loading: boolean
}>()

// States
const mutating = ref(false)
const supplierMaterialError = ref('')

// Modals
const showAddSupplierMaterialModal = ref(false)
const showEditSupplierMaterialModal = ref(false)
const showDeleteSupplierMaterialModal = ref(false)

const editingSupplierMaterial = ref<SupplierMaterial | null>(null)
const deletingSupplierMaterial = ref<SupplierMaterial | null>(null)

const supplierMaterialForm = ref({
  supplierId: '',
  materialId: '',
  price: 0
})

const resetSupplierMaterialForm = () => {
  supplierMaterialForm.value = {
    supplierId: '',
    materialId: '',
    price: 0
  }
  supplierMaterialError.value = ''
}

// Handlers
const saveAddSupplierMaterial = async () => {
  mutating.value = true
  supplierMaterialError.value = ''
  try {
    const selectedSupplier = props.suppliers.find(s => s.id === supplierMaterialForm.value.supplierId)
    const selectedMaterial = props.rawMaterials.find(m => m.id === supplierMaterialForm.value.materialId)
    
    if (!selectedSupplier || !selectedMaterial) {
      throw new Error('Supplier atau Bahan Baku tidak valid.')
    }
    
    const docRef = doc(collection(db, 'supplier_bahan'))
    await setDoc(docRef, {
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      materialId: selectedMaterial.id,
      materialName: selectedMaterial.name,
      materialPackaging: selectedMaterial.packaging,
      materialWeight: Number(selectedMaterial.weight) || 0,
      price: Number(supplierMaterialForm.value.price) || 0,
      createdAt: serverTimestamp()
    })
    showAddSupplierMaterialModal.value = false
    resetSupplierMaterialForm()
  } catch (error: any) {
    console.error('Error adding supplier material mapping:', error)
    supplierMaterialError.value = error.message || 'Gagal menambahkan data supplier-bahan.'
  } finally {
    mutating.value = false
  }
}

const openEditSupplierMaterial = (sm: SupplierMaterial) => {
  editingSupplierMaterial.value = sm
  supplierMaterialForm.value = {
    supplierId: sm.supplierId,
    materialId: sm.materialId,
    price: sm.price
  }
  showEditSupplierMaterialModal.value = true
}

const saveEditSupplierMaterial = async () => {
  if (!editingSupplierMaterial.value) return
  mutating.value = true
  supplierMaterialError.value = ''
  try {
    const selectedSupplier = props.suppliers.find(s => s.id === supplierMaterialForm.value.supplierId)
    const selectedMaterial = props.rawMaterials.find(m => m.id === supplierMaterialForm.value.materialId)
    
    if (!selectedSupplier || !selectedMaterial) {
      throw new Error('Supplier atau Bahan Baku tidak valid.')
    }
    
    const docRef = doc(db, 'supplier_bahan', editingSupplierMaterial.value.id)
    await setDoc(docRef, {
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      materialId: selectedMaterial.id,
      materialName: selectedMaterial.name,
      materialPackaging: selectedMaterial.packaging,
      materialWeight: Number(selectedMaterial.weight) || 0,
      price: Number(supplierMaterialForm.value.price) || 0
    }, { merge: true })
    showEditSupplierMaterialModal.value = false
    editingSupplierMaterial.value = null
    resetSupplierMaterialForm()
  } catch (error: any) {
    console.error('Error editing supplier material mapping:', error)
    supplierMaterialError.value = error.message || 'Gagal mengubah data supplier-bahan.'
  } finally {
    mutating.value = false
  }
}

const openDeleteSupplierMaterial = (sm: SupplierMaterial) => {
  deletingSupplierMaterial.value = sm
  showDeleteSupplierMaterialModal.value = true
}

const executeDeleteSupplierMaterial = async () => {
  if (!deletingSupplierMaterial.value) return
  mutating.value = true
  try {
    await deleteDoc(doc(db, 'supplier_bahan', deletingSupplierMaterial.value.id))
    showDeleteSupplierMaterialModal.value = false
    deletingSupplierMaterial.value = null
  } catch (error) {
    console.error('Error deleting supplier material mapping:', error)
    alert('Gagal menghapus data supplier-bahan.')
  } finally {
    mutating.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-white tracking-tight">Daftar Hubungan Suppliyer-Bahan</h2>
        <p class="text-sm text-slate-400 mt-1">Kelola data pemetaan bahan baku yang dipasok oleh supplier beserta harganya.</p>
      </div>
      <div>
        <button
          @click="showAddSupplierMaterialModal = true; resetSupplierMaterialForm()"
          class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Hubungan
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64 bg-slate-900/20 border border-slate-800 rounded-2xl">
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Memuat data hubungan supplier-bahan...</p>
      </div>
    </div>

    <!-- Supplier Materials Table Card -->
    <div v-else class="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800/80 bg-slate-900/60 text-slate-300 text-xs font-semibold uppercase tracking-wider">
              <th class="py-4 px-6">Suppliyer - Bahan Baku</th>
              <th class="py-4 px-6">Harga</th>
              <th class="py-4 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/50 text-sm text-slate-300">
            <tr 
              v-for="sm in supplierMaterials" 
              :key="sm.id"
              class="hover:bg-slate-800/20 transition-colors"
            >
              <td class="py-4 px-6 font-medium text-white">
                {{ sm.supplierName }} - {{ sm.materialName }} {{ sm.materialPackaging }} {{ sm.materialWeight }} {{ sm.materialPackaging && sm.materialPackaging.toLowerCase() === 'ltr' ? 'Liter' : (sm.materialPackaging && sm.materialPackaging.toLowerCase() === 'lbr' ? 'Lbr' : 'Kg') }}
              </td>
              <td class="py-4 px-6 text-slate-300 font-semibold">
                Rp {{ Number(sm.price).toLocaleString('id-ID') }}
              </td>
              <td class="py-4 px-6 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button 
                    @click="openEditSupplierMaterial(sm)"
                    class="p-2 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-all cursor-pointer"
                    title="Edit Hubungan"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    @click="openDeleteSupplierMaterial(sm)"
                    class="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-all cursor-pointer"
                    title="Hapus Hubungan"
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

    <!-- Add Supplier-Material Modal -->
    <div v-if="showAddSupplierMaterialModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showAddSupplierMaterialModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-4">Tambah Hubungan Supplier-Bahan</h3>
        <form @submit.prevent="saveAddSupplierMaterial" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Supplier</label>
            <select v-model="supplierMaterialForm.supplierId" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm">
              <option value="" disabled>Pilih Supplier</option>
              <option v-for="sup in suppliers" :key="sup.id" :value="sup.id">{{ sup.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Bahan Baku</label>
            <select v-model="supplierMaterialForm.materialId" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm">
              <option value="" disabled>Pilih Bahan Baku</option>
              <option v-for="mat in rawMaterials" :key="mat.id" :value="mat.id">
                {{ mat.name }} {{ mat.packaging }} {{ mat.weight }} {{ mat.packaging && mat.packaging.toLowerCase() === 'ltr' ? 'Liter' : (mat.packaging && mat.packaging.toLowerCase() === 'lbr' ? 'Lbr' : 'Kg') }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Harga (Rp)</label>
            <input v-model.number="supplierMaterialForm.price" type="number" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
          </div>
          <div v-if="supplierMaterialError" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ supplierMaterialError }}
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" @click="showAddSupplierMaterialModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
            <button type="submit" :disabled="mutating" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50">
              {{ mutating ? 'Menyimpan...' : 'Simpan Hubungan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Supplier-Material Modal -->
    <div v-if="showEditSupplierMaterialModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showEditSupplierMaterialModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-4">Edit Hubungan Supplier-Bahan</h3>
        <form @submit.prevent="saveEditSupplierMaterial" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Supplier</label>
            <select v-model="supplierMaterialForm.supplierId" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm">
              <option value="" disabled>Pilih Supplier</option>
              <option v-for="sup in suppliers" :key="sup.id" :value="sup.id">{{ sup.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Bahan Baku</label>
            <select v-model="supplierMaterialForm.materialId" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm">
              <option value="" disabled>Pilih Bahan Baku</option>
              <option v-for="mat in rawMaterials" :key="mat.id" :value="mat.id">
                {{ mat.name }} {{ mat.packaging }} {{ mat.weight }} {{ mat.packaging && mat.packaging.toLowerCase() === 'ltr' ? 'Liter' : (mat.packaging && mat.packaging.toLowerCase() === 'lbr' ? 'Lbr' : 'Kg') }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Harga (Rp)</label>
            <input v-model.number="supplierMaterialForm.price" type="number" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
          </div>
          <div v-if="supplierMaterialError" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ supplierMaterialError }}
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" @click="showEditSupplierMaterialModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
            <button type="submit" :disabled="mutating" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50">
              {{ mutating ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Supplier-Material Confirmation Modal -->
    <div v-if="showDeleteSupplierMaterialModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showDeleteSupplierMaterialModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-2">Hapus Hubungan Supplier-Bahan</h3>
        <p class="text-sm text-slate-400 mb-6">
          Apakah Anda yakin ingin menghapus hubungan antara <span class="text-white font-semibold">{{ deletingSupplierMaterial?.supplierName }}</span> dan <span class="text-white font-semibold">{{ deletingSupplierMaterial?.materialName }}</span>? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div class="flex items-center justify-end gap-3">
          <button type="button" @click="showDeleteSupplierMaterialModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
          <button type="button" @click="executeDeleteSupplierMaterial" :disabled="mutating" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all cursor-pointer disabled:opacity-50">
            {{ mutating ? 'Menghapus...' : 'Hapus Hubungan' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
