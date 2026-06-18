<script setup lang="ts">
import { ref } from 'vue'
import { db } from '../../firebase'
import { doc, setDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore'

interface ProductMaster {
  id: string
  name: string
  sku: string
}

const props = defineProps<{
  products: ProductMaster[]
  loading: boolean
  getProductRecipeCount: (productId: string) => number
  getProductMaxHpp: (productId: string) => number
}>()

// States
const mutating = ref(false)
const productError = ref('')

// Modals
const showAddProductModal = ref(false)
const showEditProductModal = ref(false)
const showDeleteProductModal = ref(false)

const editingProduct = ref<ProductMaster | null>(null)
const deletingProduct = ref<ProductMaster | null>(null)

const productForm = ref({
  name: '',
  sku: ''
})

const resetProductForm = () => {
  productForm.value = {
    name: '',
    sku: ''
  }
  productError.value = ''
}

// Handlers
const saveAddProduct = async () => {
  mutating.value = true
  productError.value = ''
  try {
    const docRef = doc(collection(db, 'barang_jadi'))
    await setDoc(docRef, {
      name: productForm.value.name,
      sku: productForm.value.sku,
      createdAt: serverTimestamp()
    })
    showAddProductModal.value = false
    resetProductForm()
  } catch (error: any) {
    console.error('Error adding product:', error)
    productError.value = error.message || 'Gagal menambahkan barang jadi.'
  } finally {
    mutating.value = false
  }
}

const openEditProduct = (prod: ProductMaster) => {
  editingProduct.value = prod
  productForm.value = {
    name: prod.name,
    sku: prod.sku
  }
  showEditProductModal.value = true
}

const saveEditProduct = async () => {
  if (!editingProduct.value) return
  mutating.value = true
  productError.value = ''
  try {
    const docRef = doc(db, 'barang_jadi', editingProduct.value.id)
    await setDoc(docRef, {
      name: productForm.value.name,
      sku: productForm.value.sku
    }, { merge: true })
    showEditProductModal.value = false
    editingProduct.value = null
    resetProductForm()
  } catch (error: any) {
    console.error('Error editing product:', error)
    productError.value = error.message || 'Gagal mengubah barang jadi.'
  } finally {
    mutating.value = false
  }
}

const openDeleteProduct = (prod: ProductMaster) => {
  deletingProduct.value = prod
  showDeleteProductModal.value = true
}

const executeDeleteProduct = async () => {
  if (!deletingProduct.value) return
  mutating.value = true
  try {
    await deleteDoc(doc(db, 'barang_jadi', deletingProduct.value.id))
    showDeleteProductModal.value = false
    deletingProduct.value = null
  } catch (error) {
    console.error('Error deleting product:', error)
    alert('Gagal menghapus barang jadi.')
  } finally {
    mutating.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Title and Actions -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-3">
          <h2 class="text-2xl font-bold text-white tracking-tight">Daftar Barang Jadi</h2>
          <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {{ products.length }} Produk
          </span>
        </div>
        <p class="text-sm text-slate-400 mt-1">Master produk barang jadi untuk kebutuhan produksi dan kalkulasi HPP.</p>
      </div>
      <div>
        <button
          @click="showAddProductModal = true; resetProductForm()"
          class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Barang Jadi
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64 bg-slate-900/20 border border-slate-800 rounded-2xl">
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Memuat master barang jadi...</p>
      </div>
    </div>

    <!-- Products Table Card -->
    <div v-else class="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800/80 bg-slate-900/60 text-slate-300 text-xs font-semibold uppercase tracking-wider">
              <th class="py-4 px-6">Nama Barang</th>
              <th class="py-4 px-6">SKU Dasar</th>
              <th class="py-4 px-6 text-center">Jumlah Resep / Varian</th>
              <th class="py-4 px-6 text-right font-bold text-indigo-400">HPP Termahal</th>
              <th class="py-4 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/50 text-sm text-slate-300">
            <tr 
              v-for="prod in products" 
              :key="prod.id"
              class="hover:bg-slate-800/20 transition-colors"
            >
              <td class="py-4 px-6 font-medium text-white">{{ prod.name }}</td>
              <td class="py-4 px-6 font-mono text-slate-400">{{ prod.sku }}</td>
              <td class="py-4 px-6 text-center text-purple-400 font-semibold">
                {{ getProductRecipeCount(prod.id) }} varian
              </td>
              <td class="py-4 px-6 text-right font-bold text-indigo-400">
                Rp {{ Math.round(getProductMaxHpp(prod.id)).toLocaleString('id-ID') }}
              </td>
              <td class="py-4 px-6 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button 
                    @click="openEditProduct(prod)"
                    class="p-2 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-all cursor-pointer"
                    title="Edit Barang Jadi"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    @click="openDeleteProduct(prod)"
                    class="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-all cursor-pointer"
                    title="Hapus Barang Jadi"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="products.length === 0">
              <td colspan="5" class="py-12 text-center text-slate-500">
                Belum ada data barang jadi. Klik "Tambah Barang Jadi" untuk memulai.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Product Modal -->
    <div v-if="showAddProductModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showAddProductModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-4">Tambah Barang Jadi Baru</h3>
        <form @submit.prevent="saveAddProduct" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nama Barang</label>
            <input v-model="productForm.name" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" placeholder="Nama Barang Jadi (cth: Semprong Wijen Reg 200 Gr)" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">SKU Dasar</label>
            <input v-model="productForm.sku" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" placeholder="SWR200" />
          </div>
          <div v-if="productError" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ productError }}
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" @click="showAddProductModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
            <button type="submit" :disabled="mutating" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50">
              {{ mutating ? 'Menyimpan...' : 'Simpan Barang Jadi' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Product Modal -->
    <div v-if="showEditProductModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showEditProductModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-4">Edit Barang Jadi</h3>
        <form @submit.prevent="saveEditProduct" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nama Barang</label>
            <input v-model="productForm.name" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">SKU Dasar</label>
            <input v-model="productForm.sku" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
          </div>
          <div v-if="productError" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ productError }}
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" @click="showEditProductModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
            <button type="submit" :disabled="mutating" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50">
              {{ mutating ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Product Modal -->
    <div v-if="showDeleteProductModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showDeleteProductModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-2">Hapus Barang Jadi</h3>
        <p class="text-sm text-slate-400 mb-6">
          Apakah Anda yakin ingin menghapus barang jadi <span class="text-white font-semibold">{{ deletingProduct?.name }}</span>? Tindakan ini tidak akan menghapus resep yang terikat, namun resep tersebut tidak akan memiliki referensi produk. Tindakan ini tidak dapat dibatalkan.
        </p>
        <div class="flex items-center justify-end gap-3">
          <button type="button" @click="showDeleteProductModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
          <button type="button" @click="executeDeleteProduct" :disabled="mutating" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all cursor-pointer disabled:opacity-50">
            {{ mutating ? 'Menghapus...' : 'Hapus Barang Jadi' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
