<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { db } from '../../firebase'
import { doc, setDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore'

interface RecipeItem {
  materialId: string
  quantity: number
}

interface ProductMaster {
  id: string
  name: string
  sku: string
}

interface OverheadItem {
  name: string
  cost: number
}

interface HppRecipe {
  id: string
  productId: string
  variantSku: string
  printingLaborCost: number
  packagingLaborCost: number
  overheadCost: number
  overhead?: OverheadItem[]
  recipe: RecipeItem[]
  batchSize: number
  createdAt: string
}

interface RawMaterial {
  id: string
  name: string
  packaging: string
  weight: number
  createdAt: string
}

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

const props = defineProps<{
  hppRecipes: HppRecipe[]
  products: ProductMaster[]
  rawMaterials: RawMaterial[]
  supplierMaterials: SupplierMaterial[]
  loading: boolean
}>()

// States
const mutating = ref(false)
const recipeError = ref('')

// Modals
const showAddRecipeModal = ref(false)
const showEditRecipeModal = ref(false)
const showDeleteRecipeModal = ref(false)

const editingRecipe = ref<HppRecipe | null>(null)
const deletingRecipe = ref<HppRecipe | null>(null)

const recipeForm = ref({
  productId: '',
  variantSku: '',
  printingLaborCost: 0,
  packagingLaborCost: 0,
  overheadCost: 0,
  batchSize: 1,
  recipe: [{ materialId: '', quantity: 0 }] as RecipeItem[],
  overhead: [{ name: '', cost: 0 }] as OverheadItem[]
})

watch(() => recipeForm.value.productId, (newVal) => {
  if (newVal && !editingRecipe.value) {
    const selectedProd = props.products.find(p => p.id === newVal)
    if (selectedProd && selectedProd.sku) {
      recipeForm.value.variantSku = `${selectedProd.sku}.`
    }
  }
})

const resetRecipeForm = () => {
  recipeForm.value = {
    productId: '',
    variantSku: '',
    printingLaborCost: 0,
    packagingLaborCost: 0,
    overheadCost: 0,
    batchSize: 1,
    recipe: [{ materialId: '', quantity: 0 }],
    overhead: [{ name: '', cost: 0 }]
  }
  recipeError.value = ''
}

const addRecipeFormRecipeItem = () => {
  recipeForm.value.recipe.push({ materialId: '', quantity: 0 })
}

const removeRecipeFormRecipeItem = (index: number) => {
  if (recipeForm.value.recipe.length > 1) {
    recipeForm.value.recipe.splice(index, 1)
  }
}

const addRecipeFormOverheadItem = () => {
  recipeForm.value.overhead.push({ name: '', cost: 0 })
}

const removeRecipeFormOverheadItem = (index: number) => {
  if (recipeForm.value.overhead.length > 1) {
    recipeForm.value.overhead.splice(index, 1)
  }
}

// Helpers for calculations
const getProductNameById = (productId: string) => {
  const p = props.products.find(prod => prod.id === productId)
  return p ? p.name : 'Produk Tidak Ditemukan'
}

const getBaseName = (name: string) => {
  return name.replace(/\s*[\d.,]+\s*(kg|g|gr|gram|liter|ltr|pcs|lbr|pack|pk)?\s*$/i, '').trim();
}

const uniqueRawMaterials = computed(() => {
  const seen = new Set<string>()
  const result: { name: string; packaging: string }[] = []
  
  props.rawMaterials.forEach(mat => {
    const baseName = getBaseName(mat.name)
    const key = baseName.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      result.push({
        name: baseName,
        packaging: mat.packaging || 'Kg'
      })
    }
  })
  
  return result.sort((a, b) => a.name.localeCompare(b.name))
})

const getBaseMaterialPricePerUnit = (baseName: string) => {
  const matchingMaterials = props.rawMaterials.filter(
    m => getBaseName(m.name).toLowerCase() === baseName.toLowerCase()
  )
  const allPrices: number[] = []
  
  matchingMaterials.forEach(mat => {
    const pricesForMat = props.supplierMaterials
      .filter(sm => sm.materialId === mat.id && sm.materialWeight > 0)
      .map(sm => sm.price / sm.materialWeight)
    
    if (pricesForMat.length > 0) {
      allPrices.push(...pricesForMat)
    } else {
      const fallbackPrices = props.supplierMaterials
        .filter(sm => sm.materialId === mat.id)
        .map(sm => sm.price)
      if (fallbackPrices.length > 0) {
        allPrices.push(...fallbackPrices)
      }
    }
  })
  
  if (allPrices.length > 0) {
    const sum = allPrices.reduce((a, b) => a + b, 0)
    return sum / allPrices.length
  }
  return 0
}

const getMaterialPricePerUnit = (materialId: string) => {
  const mat = props.rawMaterials.find(m => m.id === materialId)
  const baseName = mat ? getBaseName(mat.name) : materialId
  return getBaseMaterialPricePerUnit(baseName)
}

const calculateRecipeMaterialCost = (recipe: RecipeItem[]) => {
  if (!recipe) return 0
  return recipe.reduce((total, r) => {
    return total + (r.quantity * getMaterialPricePerUnit(r.materialId))
  }, 0)
}

// Handlers
const saveAddRecipe = async () => {
  mutating.value = true
  recipeError.value = ''
  try {
    const calculatedOverheadCost = recipeForm.value.overhead.reduce((sum, o) => sum + (Number(o.cost) || 0), 0)
    const docRef = doc(collection(db, 'hpp_recipes'))
    await setDoc(docRef, {
      productId: recipeForm.value.productId,
      variantSku: recipeForm.value.variantSku,
      printingLaborCost: Number(recipeForm.value.printingLaborCost) || 0,
      packagingLaborCost: Number(recipeForm.value.packagingLaborCost) || 0,
      overheadCost: calculatedOverheadCost,
      overhead: recipeForm.value.overhead.map(o => ({
        name: o.name,
        cost: Number(o.cost) || 0
      })),
      batchSize: Number(recipeForm.value.batchSize) || 1,
      recipe: recipeForm.value.recipe.map(r => ({
        materialId: r.materialId,
        quantity: Number(r.quantity) || 0
      })),
      createdAt: serverTimestamp()
    })
    showAddRecipeModal.value = false
    resetRecipeForm()
  } catch (error: any) {
    console.error('Error adding recipe:', error)
    recipeError.value = error.message || 'Gagal menambahkan resep HPP.'
  } finally {
    mutating.value = false
  }
}

const openEditRecipe = (rec: HppRecipe) => {
  editingRecipe.value = rec
  const mappedRecipe = rec.recipe && rec.recipe.length > 0
    ? rec.recipe.map(r => {
        let baseName = r.materialId
        const mat = props.rawMaterials.find(m => m.id === r.materialId)
        if (mat) baseName = mat.name
        return { materialId: baseName, quantity: r.quantity }
      })
    : [{ materialId: '', quantity: 0 }]
  
  const mappedOverhead = rec.overhead && rec.overhead.length > 0
    ? rec.overhead.map(o => ({ name: o.name, cost: o.cost }))
    : [{ name: 'Overhead', cost: rec.overheadCost || 0 }]

  recipeForm.value = {
    productId: rec.productId,
    variantSku: rec.variantSku,
    printingLaborCost: rec.printingLaborCost,
    packagingLaborCost: rec.packagingLaborCost,
    overheadCost: rec.overheadCost,
    batchSize: rec.batchSize || 1,
    recipe: mappedRecipe,
    overhead: mappedOverhead
  }
  showEditRecipeModal.value = true
}

const saveEditRecipe = async () => {
  if (!editingRecipe.value) return
  mutating.value = true
  recipeError.value = ''
  try {
    const calculatedOverheadCost = recipeForm.value.overhead.reduce((sum, o) => sum + (Number(o.cost) || 0), 0)
    const docRef = doc(db, 'hpp_recipes', editingRecipe.value.id)
    await setDoc(docRef, {
      productId: recipeForm.value.productId,
      variantSku: recipeForm.value.variantSku,
      printingLaborCost: Number(recipeForm.value.printingLaborCost) || 0,
      packagingLaborCost: Number(recipeForm.value.packagingLaborCost) || 0,
      overheadCost: calculatedOverheadCost,
      overhead: recipeForm.value.overhead.map(o => ({
        name: o.name,
        cost: Number(o.cost) || 0
      })),
      batchSize: Number(recipeForm.value.batchSize) || 1,
      recipe: recipeForm.value.recipe.map(r => ({
        materialId: r.materialId,
        quantity: Number(r.quantity) || 0
      }))
    }, { merge: true })
    showEditRecipeModal.value = false
    editingRecipe.value = null
    resetRecipeForm()
  } catch (error: any) {
    console.error('Error editing recipe:', error)
    recipeError.value = error.message || 'Gagal mengubah resep HPP.'
  } finally {
    mutating.value = false
  }
}

const openDeleteRecipe = (rec: HppRecipe) => {
  deletingRecipe.value = rec
  showDeleteRecipeModal.value = true
}

const executeDeleteRecipe = async () => {
  if (!deletingRecipe.value) return
  mutating.value = true
  try {
    await deleteDoc(doc(db, 'hpp_recipes', deletingRecipe.value.id))
    showDeleteRecipeModal.value = false
    deletingRecipe.value = null
  } catch (error) {
    console.error('Error deleting recipe:', error)
    alert('Gagal menghapus resep HPP.')
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
          <h2 class="text-2xl font-bold text-white tracking-tight">Harga Pokok Produksi (Resep)</h2>
          <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {{ hppRecipes.length }} Resep
          </span>
        </div>
        <p class="text-sm text-slate-400 mt-1">Kelola detail formula bahan baku dan biaya tenaga kerja / overhead untuk setiap varian resep.</p>
      </div>
      <div>
        <button
          @click="showAddRecipeModal = true; resetRecipeForm()"
          :disabled="products.length === 0"
          class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Resep HPP
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64 bg-slate-900/20 border border-slate-800 rounded-2xl">
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Memuat resep HPP...</p>
      </div>
    </div>

    <!-- Recipes Table Card -->
    <div v-else class="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800/80 bg-slate-900/60 text-slate-300 text-xs font-semibold uppercase tracking-wider">
              <th class="py-4 px-6">Barang Jadi & Varian SKU</th>
              <th class="py-4 px-6 text-right">Bahan Baku</th>
              <th class="py-4 px-6 text-right">Upah Cetak</th>
              <th class="py-4 px-6 text-right">Upah Kemas</th>
              <th class="py-4 px-6 text-right">Overhead</th>
              <th class="py-4 px-6 text-right font-bold">Total Cost</th>
              <th class="py-4 px-6 text-right">Hasil</th>
              <th class="py-4 px-6 text-right font-bold text-indigo-400">Total HPP</th>
              <th class="py-4 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/50 text-sm text-slate-300">
            <tr 
              v-for="rec in hppRecipes" 
              :key="rec.id"
              class="hover:bg-slate-800/20 transition-colors"
            >
              <td class="py-4 px-6 font-medium text-white">
                <div class="font-bold">{{ getProductNameById(rec.productId) }}</div>
                <div class="text-xs text-slate-500 mt-0.5">Varian SKU: {{ rec.variantSku }}</div>
              </td>
              <td class="py-4 px-6 text-right font-medium">
                <div class="font-semibold text-slate-300">Rp {{ Math.round(calculateRecipeMaterialCost(rec.recipe)).toLocaleString('id-ID') }}</div>
                <div v-if="rec.recipe && rec.recipe.length > 0" class="text-[10px] text-slate-500 mt-1 space-y-0.5">
                  <div v-for="(r, rIdx) in rec.recipe" :key="rIdx" class="whitespace-nowrap">
                    {{ r.materialId }}: {{ r.quantity }}
                  </div>
                </div>
              </td>
              <td class="py-4 px-6 text-right">
                Rp {{ Number(rec.printingLaborCost).toLocaleString('id-ID') }}
              </td>
              <td class="py-4 px-6 text-right">
                Rp {{ Number(rec.packagingLaborCost).toLocaleString('id-ID') }}
              </td>
              <td class="py-4 px-6 text-right">
                <div class="font-semibold text-slate-300">Rp {{ Number(rec.overheadCost).toLocaleString('id-ID') }}</div>
                <div v-if="rec.overhead && rec.overhead.length > 0" class="text-[10px] text-slate-500 mt-1 space-y-0.5">
                  <div v-for="(o, oIdx) in rec.overhead" :key="oIdx" class="whitespace-nowrap">
                    {{ o.name }}: Rp {{ Number(o.cost).toLocaleString('id-ID') }}
                  </div>
                </div>
              </td>
              <td class="py-4 px-6 text-right font-bold text-slate-200">
                Rp {{ Math.round(calculateRecipeMaterialCost(rec.recipe) + rec.printingLaborCost + rec.packagingLaborCost + rec.overheadCost).toLocaleString('id-ID') }}
              </td>
              <td class="py-4 px-6 text-right text-purple-400 font-semibold">
                {{ rec.batchSize }} pcs
              </td>
              <td class="py-4 px-6 text-right font-bold text-indigo-400">
                Rp {{ Math.round((calculateRecipeMaterialCost(rec.recipe) + rec.printingLaborCost + rec.packagingLaborCost + rec.overheadCost) / (rec.batchSize || 1)).toLocaleString('id-ID') }}
              </td>
              <td class="py-4 px-6 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button 
                    @click="openEditRecipe(rec)"
                    class="p-2 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-all cursor-pointer"
                    title="Edit Resep"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    @click="openDeleteRecipe(rec)"
                    class="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-all cursor-pointer"
                    title="Hapus Resep"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="hppRecipes.length === 0">
              <td colspan="9" class="py-12 text-center text-slate-500">
                Belum ada data resep HPP. Klik "Tambah Resep HPP" untuk memulai.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Recipe Modal -->
    <div v-if="showAddRecipeModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showAddRecipeModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold text-white mb-4">Tambah Resep HPP Baru</h3>
        <form @submit.prevent="saveAddRecipe" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Pilih Barang Jadi</label>
            <select v-model="recipeForm.productId" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm">
              <option value="" disabled>Pilih Barang Jadi</option>
              <option v-for="prod in products" :key="prod.id" :value="prod.id">{{ prod.name }} ({{ prod.sku }})</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Varian SKU / Kode Resep</label>
            <input v-model="recipeForm.variantSku" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" placeholder="SWR200.3" />
          </div>
          <div class="grid grid-cols-4 gap-3">
            <div class="flex flex-col">
              <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider h-8 flex items-end pb-1 leading-tight">Upah Cetak (Rp)</label>
              <input v-model.number="recipeForm.printingLaborCost" type="number" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
            </div>
            <div class="flex flex-col">
              <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider h-8 flex items-end pb-1 leading-tight">Upah Kemas (Rp)</label>
              <input v-model.number="recipeForm.packagingLaborCost" type="number" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
            </div>
            <div class="flex flex-col">
              <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider h-8 flex items-end pb-1 leading-tight">Overhead (Rp)</label>
              <div class="w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-950/60 text-slate-400 sm:text-sm h-[38px] flex items-center font-semibold">
                {{ recipeForm.overhead.reduce((sum, o) => sum + (Number(o.cost) || 0), 0).toLocaleString('id-ID') }}
              </div>
            </div>
            <div class="flex flex-col">
              <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider h-8 flex items-end pb-1 leading-tight">Hasil (Pcs)</label>
              <input v-model.number="recipeForm.batchSize" type="number" min="1" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
            </div>
          </div>

          <!-- Overhead Details Block -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider">Detail Overhead</label>
              <button 
                type="button" 
                @click="addRecipeFormOverheadItem"
                class="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
              >
                + Tambah Overhead
              </button>
            </div>
            <div class="space-y-3 max-h-48 overflow-y-auto pr-1 mb-4">
              <div 
                v-for="(item, index) in recipeForm.overhead" 
                :key="index"
                class="flex items-center gap-2"
              >
                <input 
                  v-model="item.name" 
                  type="text"
                  required
                  placeholder="Nama Overhead (cth: Plastik, Listrik)"
                  class="flex-1 min-w-0 px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
                />
                <input 
                  v-model.number="item.cost" 
                  type="number" 
                  required 
                  placeholder="Biaya"
                  class="w-28 px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
                />
                <button 
                  type="button" 
                  @click="removeRecipeFormOverheadItem(index)"
                  :disabled="recipeForm.overhead.length <= 1"
                  class="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-30 rounded-lg border border-red-500/20 transition-all cursor-pointer shrink-0"
                  title="Hapus Overhead"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider">Formula Resep (Bahan Baku)</label>
              <button 
                type="button" 
                @click="addRecipeFormRecipeItem"
                class="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
              >
                + Tambah Bahan
              </button>
            </div>
            <div class="space-y-3 max-h-48 overflow-y-auto pr-1">
              <div 
                v-for="(item, index) in recipeForm.recipe" 
                :key="index"
                class="flex items-center gap-2"
              >
                <select 
                  v-model="item.materialId" 
                  required
                  class="flex-1 min-w-0 px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
                >
                  <option value="" disabled>Pilih Bahan Baku</option>
                  <option v-for="mat in uniqueRawMaterials" :key="mat.name" :value="mat.name">
                    {{ mat.name }} - Avg. Rp {{ Math.round(getBaseMaterialPricePerUnit(mat.name)).toLocaleString('id-ID') }}/{{ mat.packaging && mat.packaging.toLowerCase() === 'ltr' ? 'Liter' : (mat.packaging && mat.packaging.toLowerCase() === 'lbr' ? 'Lbr' : 'Kg') }}
                  </option>
                </select>
                <input 
                  v-model.number="item.quantity" 
                  type="number" 
                  step="any" 
                  required 
                  placeholder="Jumlah"
                  class="w-24 px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
                />
                <button 
                  type="button" 
                  @click="removeRecipeFormRecipeItem(index)"
                  :disabled="recipeForm.recipe.length <= 1"
                  class="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-30 rounded-lg border border-red-500/20 transition-all cursor-pointer shrink-0"
                  title="Hapus Bahan"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div v-if="recipeError" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ recipeError }}
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" @click="showAddRecipeModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
            <button type="submit" :disabled="mutating" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50">
              {{ mutating ? 'Menyimpan...' : 'Simpan Resep HPP' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Recipe Modal -->
    <div v-if="showEditRecipeModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showEditRecipeModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold text-white mb-4">Edit Resep HPP</h3>
        <form @submit.prevent="saveEditRecipe" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Pilih Barang Jadi</label>
            <select v-model="recipeForm.productId" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm">
              <option value="" disabled>Pilih Barang Jadi</option>
              <option v-for="prod in products" :key="prod.id" :value="prod.id">{{ prod.name }} ({{ prod.sku }})</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Varian SKU / Kode Resep</label>
            <input v-model="recipeForm.variantSku" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
          </div>
          <div class="grid grid-cols-4 gap-3">
            <div class="flex flex-col">
              <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider h-8 flex items-end pb-1 leading-tight">Upah Cetak (Rp)</label>
              <input v-model.number="recipeForm.printingLaborCost" type="number" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
            </div>
            <div class="flex flex-col">
              <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider h-8 flex items-end pb-1 leading-tight">Upah Kemas (Rp)</label>
              <input v-model.number="recipeForm.packagingLaborCost" type="number" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
            </div>
            <div class="flex flex-col">
              <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider h-8 flex items-end pb-1 leading-tight">Overhead (Rp)</label>
              <div class="w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-950/60 text-slate-400 sm:text-sm h-[38px] flex items-center font-semibold">
                {{ recipeForm.overhead.reduce((sum, o) => sum + (Number(o.cost) || 0), 0).toLocaleString('id-ID') }}
              </div>
            </div>
            <div class="flex flex-col">
              <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider h-8 flex items-end pb-1 leading-tight">Hasil (Pcs)</label>
              <input v-model.number="recipeForm.batchSize" type="number" min="1" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
            </div>
          </div>

          <!-- Overhead Details Block -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider">Detail Overhead</label>
              <button 
                type="button" 
                @click="addRecipeFormOverheadItem"
                class="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
              >
                + Tambah Overhead
              </button>
            </div>
            <div class="space-y-3 max-h-48 overflow-y-auto pr-1 mb-4">
              <div 
                v-for="(item, index) in recipeForm.overhead" 
                :key="index"
                class="flex items-center gap-2"
              >
                <input 
                  v-model="item.name" 
                  type="text"
                  required
                  placeholder="Nama Overhead (cth: Plastik, Listrik)"
                  class="flex-1 min-w-0 px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
                />
                <input 
                  v-model.number="item.cost" 
                  type="number" 
                  required 
                  placeholder="Biaya"
                  class="w-28 px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
                />
                <button 
                  type="button" 
                  @click="removeRecipeFormOverheadItem(index)"
                  :disabled="recipeForm.overhead.length <= 1"
                  class="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-30 rounded-lg border border-red-500/20 transition-all cursor-pointer shrink-0"
                  title="Hapus Overhead"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider">Formula Resep (Bahan Baku)</label>
              <button 
                type="button" 
                @click="addRecipeFormRecipeItem"
                class="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
              >
                + Tambah Bahan
              </button>
            </div>
            <div class="space-y-3 max-h-48 overflow-y-auto pr-1">
              <div 
                v-for="(item, index) in recipeForm.recipe" 
                :key="index"
                class="flex items-center gap-2"
              >
                <select 
                  v-model="item.materialId" 
                  required
                  class="flex-1 min-w-0 px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
                >
                  <option value="" disabled>Pilih Bahan Baku</option>
                  <option v-for="mat in uniqueRawMaterials" :key="mat.name" :value="mat.name">
                    {{ mat.name }} - Avg. Rp {{ Math.round(getBaseMaterialPricePerUnit(mat.name)).toLocaleString('id-ID') }}/{{ mat.packaging && mat.packaging.toLowerCase() === 'ltr' ? 'Liter' : (mat.packaging && mat.packaging.toLowerCase() === 'lbr' ? 'Lbr' : 'Kg') }}
                  </option>
                </select>
                <input 
                  v-model.number="item.quantity" 
                  type="number" 
                  step="any" 
                  required 
                  placeholder="Jumlah"
                  class="w-24 px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
                />
                <button 
                  type="button" 
                  @click="removeRecipeFormRecipeItem(index)"
                  :disabled="recipeForm.recipe.length <= 1"
                  class="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-30 rounded-lg border border-red-500/20 transition-all cursor-pointer shrink-0"
                  title="Hapus Bahan"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div v-if="recipeError" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ recipeError }}
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" @click="showEditRecipeModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
            <button type="submit" :disabled="mutating" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50">
              {{ mutating ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Recipe Modal -->
    <div v-if="showDeleteRecipeModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showDeleteRecipeModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-2">Hapus Resep HPP</h3>
        <p class="text-sm text-slate-400 mb-6">
          Apakah Anda yakin ingin menghapus resep varian <span class="text-white font-semibold">{{ deletingRecipe?.variantSku }}</span>? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div class="flex items-center justify-end gap-3">
          <button type="button" @click="showDeleteRecipeModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
          <button type="button" @click="executeDeleteRecipe" :disabled="mutating" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all cursor-pointer disabled:opacity-50">
            {{ mutating ? 'Menghapus...' : 'Hapus Resep' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
