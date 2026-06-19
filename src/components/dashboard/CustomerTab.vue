<script setup lang="ts">
import { ref } from 'vue'
import { db } from '../../firebase'
import { doc, setDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore'

interface CustomerItem {
  itemName: string
  price: number
}

interface Customer {
  id: string
  name: string
  address: string
  city: string
  googleMap: string
  items: CustomerItem[]
  createdAt: string
}

interface City {
  id: string
  cityName: string
  createdAt: string
}

defineProps<{
  customers: Customer[]
  cities: City[]
  loading: boolean
}>()

// States
const mutating = ref(false)
const customerError = ref('')

// Modals display states
const showAddCustomerModal = ref(false)
const showEditCustomerModal = ref(false)
const showDeleteCustomerModal = ref(false)

// Edit / Delete references
const editingCustomer = ref<Customer | null>(null)
const deletingCustomer = ref<Customer | null>(null)

// Form states
const customerForm = ref<{
  name: string
  address: string
  city: string
  googleMap: string
  items: CustomerItem[]
}>({
  name: '',
  address: '',
  city: '',
  googleMap: '',
  items: [{ itemName: '', price: 0 }]
})

const addFormItem = () => {
  customerForm.value.items.push({ itemName: '', price: 0 })
}

const removeFormItem = (index: number) => {
  if (customerForm.value.items.length > 1) {
    customerForm.value.items.splice(index, 1)
  }
}

const resetCustomerForm = () => {
  customerForm.value = {
    name: '',
    address: '',
    city: '',
    googleMap: '',
    items: [{ itemName: '', price: 0 }]
  }
  customerError.value = ''
}

// Handlers
const openEditCustomer = (cust: Customer) => {
  editingCustomer.value = cust
  const mappedItems = cust.items && cust.items.length > 0
    ? cust.items.map(i => ({ itemName: i.itemName, price: i.price }))
    : [{ itemName: '', price: 0 }]
  customerForm.value = {
    name: cust.name,
    address: cust.address,
    city: cust.city,
    googleMap: cust.googleMap,
    items: mappedItems
  }
  showEditCustomerModal.value = true
}

const saveAddCustomer = async () => {
  mutating.value = true
  customerError.value = ''
  try {
    const docRef = doc(collection(db, 'customers'))
    await setDoc(docRef, {
      name: customerForm.value.name,
      address: customerForm.value.address,
      city: customerForm.value.city,
      googleMap: customerForm.value.googleMap,
      items: customerForm.value.items.map(i => ({
        itemName: i.itemName,
        price: Number(i.price) || 0
      })),
      createdAt: serverTimestamp()
    })
    showAddCustomerModal.value = false
    resetCustomerForm()
  } catch (error: any) {
    console.error('Error adding customer:', error)
    customerError.value = error.message || 'Gagal menambahkan pelanggan.'
  } finally {
    mutating.value = false
  }
}

const saveEditCustomer = async () => {
  if (!editingCustomer.value) return
  mutating.value = true
  customerError.value = ''
  try {
    const docRef = doc(db, 'customers', editingCustomer.value.id)
    await setDoc(docRef, {
      name: customerForm.value.name,
      address: customerForm.value.address,
      city: customerForm.value.city,
      googleMap: customerForm.value.googleMap,
      items: customerForm.value.items.map(i => ({
        itemName: i.itemName,
        price: Number(i.price) || 0
      }))
    }, { merge: true })
    showEditCustomerModal.value = false
    editingCustomer.value = null
    resetCustomerForm()
  } catch (error: any) {
    console.error('Error editing customer:', error)
    customerError.value = error.message || 'Gagal mengubah data pelanggan.'
  } finally {
    mutating.value = false
  }
}

const openDeleteCustomer = (cust: Customer) => {
  deletingCustomer.value = cust
  showDeleteCustomerModal.value = true
}

const executeDeleteCustomer = async () => {
  if (!deletingCustomer.value) return
  mutating.value = true
  try {
    await deleteDoc(doc(db, 'customers', deletingCustomer.value.id))
    showDeleteCustomerModal.value = false
    deletingCustomer.value = null
  } catch (error) {
    console.error('Error deleting customer:', error)
    alert('Gagal menghapus pelanggan.')
  } finally {
    mutating.value = false
  }
}
</script>

<template>
  <div class="space-y-6 justify-start mt-0">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-white tracking-tight">Daftar Pelanggan (Customer)</h2>
        <p class="text-sm text-slate-400 mt-1">Kelola data pelanggan, alamat, dan harga produk.</p>
      </div>
      <div>
        <button
          @click="showAddCustomerModal = true; resetCustomerForm()"
          class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Customer
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64 bg-slate-900/20 border border-slate-800 rounded-2xl">
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Memuat data pelanggan...</p>
      </div>
    </div>

    <!-- Customer Table Card -->
    <div v-else class="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800/80 bg-slate-900/60 text-slate-300 text-xs font-semibold uppercase tracking-wider">
              <th class="py-4 px-6">Nama</th>
              <th class="py-4 px-6">Alamat</th>
              <th class="py-4 px-6">Kota</th>
              <th class="py-4 px-6">Google Map</th>
              <th class="py-4 px-6">Barang</th>
              <th class="py-4 px-6">Harga</th>
              <th class="py-4 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/50 text-sm text-slate-300">
            <tr 
              v-for="cust in customers" 
              :key="cust.id"
              class="hover:bg-slate-800/20 transition-colors"
            >
              <td class="py-4 px-6 font-medium text-white">{{ cust.name }}</td>
              <td class="py-4 px-6 text-slate-400">{{ cust.address }}</td>
              <td class="py-4 px-6 text-slate-400">{{ cust.city }}</td>
              <td class="py-4 px-6">
                <a 
                  v-if="cust.googleMap"
                  :href="cust.googleMap" 
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
              <td class="py-4 px-6 text-slate-400">
                <div class="space-y-1">
                  <div v-for="(item, idx) in cust.items" :key="idx">
                    {{ item.itemName || '-' }}
                  </div>
                  <div v-if="!cust.items || cust.items.length === 0">-</div>
                </div>
              </td>
              <td class="py-4 px-6 font-semibold text-emerald-400">
                <div class="space-y-1">
                  <div v-for="(item, idx) in cust.items" :key="idx">
                    Rp {{ item.price.toLocaleString('id-ID') }}
                  </div>
                  <div v-if="!cust.items || cust.items.length === 0">-</div>
                </div>
              </td>
              <td class="py-4 px-6 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button 
                    @click="openEditCustomer(cust)"
                    class="p-2 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-all cursor-pointer"
                    title="Edit Customer"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    @click="openDeleteCustomer(cust)"
                    class="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-all cursor-pointer"
                    title="Hapus Customer"
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

    <!-- Add Customer Modal -->
    <div v-if="showAddCustomerModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showAddCustomerModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-4">Tambah Customer Baru</h3>
        <form @submit.prevent="saveAddCustomer" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nama</label>
            <input v-model="customerForm.name" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" placeholder="Nama Pelanggan" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Alamat</label>
            <input v-model="customerForm.address" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" placeholder="Alamat Lengkap" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Kota</label>
            <select v-model="customerForm.city" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm">
              <option value="" disabled>Pilih Kota</option>
              <option v-for="city in cities" :key="city.id" :value="city.cityName">{{ city.cityName }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Google Map (Link URL)</label>
            <input v-model="customerForm.googleMap" type="url" class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" placeholder="https://maps.google.com/..." />
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider">Daftar Barang & Harga</label>
              <button 
                type="button" 
                @click="addFormItem"
                class="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
              >
                + Tambah Barang
              </button>
            </div>
            <div class="max-h-40 overflow-y-auto space-y-3 pr-1">
              <div 
                v-for="(item, index) in customerForm.items" 
                :key="index"
                class="flex items-center gap-2"
              >
                <input 
                  v-model="item.itemName" 
                  type="text" 
                  required 
                  placeholder="Nama Barang"
                  class="flex-1 min-w-0 px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
                />
                <input 
                  v-model.number="item.price" 
                  type="number" 
                  required 
                  placeholder="Harga"
                  class="w-28 px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
                />
                <button 
                  type="button" 
                  @click="removeFormItem(index)"
                  :disabled="customerForm.items.length <= 1"
                  class="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-30 rounded-lg border border-red-500/20 transition-all cursor-pointer shrink-0"
                  title="Hapus Barang"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div v-if="customerError" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ customerError }}
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" @click="showAddCustomerModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
            <button type="submit" :disabled="mutating" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50">
              {{ mutating ? 'Menyimpan...' : 'Simpan Customer' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Customer Modal -->
    <div v-if="showEditCustomerModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showEditCustomerModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-4">Edit Data Customer</h3>
        <form @submit.prevent="saveEditCustomer" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nama</label>
            <input v-model="customerForm.name" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Alamat</label>
            <input v-model="customerForm.address" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Kota</label>
            <select v-model="customerForm.city" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm">
              <option value="" disabled>Pilih Kota</option>
              <option v-for="city in cities" :key="city.id" :value="city.cityName">{{ city.cityName }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Google Map (Link URL)</label>
            <input v-model="customerForm.googleMap" type="url" class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider">Daftar Barang & Harga</label>
              <button 
                type="button" 
                @click="addFormItem"
                class="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
              >
                + Tambah Barang
              </button>
            </div>
            <div class="max-h-40 overflow-y-auto space-y-3 pr-1">
              <div 
                v-for="(item, index) in customerForm.items" 
                :key="index"
                class="flex items-center gap-2"
              >
                <input 
                  v-model="item.itemName" 
                  type="text" 
                  required 
                  placeholder="Nama Barang"
                  class="flex-1 min-w-0 px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
                />
                <input 
                  v-model.number="item.price" 
                  type="number" 
                  required 
                  placeholder="Harga"
                  class="w-28 px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
                />
                <button 
                  type="button" 
                  @click="removeFormItem(index)"
                  :disabled="customerForm.items.length <= 1"
                  class="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-30 rounded-lg border border-red-500/20 transition-all cursor-pointer shrink-0"
                  title="Hapus Barang"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div v-if="customerError" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ customerError }}
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" @click="showEditCustomerModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
            <button type="submit" :disabled="mutating" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50">
              {{ mutating ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Customer Modal -->
    <div v-if="showDeleteCustomerModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showDeleteCustomerModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-2">Hapus Customer</h3>
        <p class="text-sm text-slate-400 mb-6">
          Apakah Anda yakin ingin menghapus pelanggan <span class="text-white font-semibold">{{ deletingCustomer?.name }}</span>? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div class="flex items-center justify-end gap-3">
          <button type="button" @click="showDeleteCustomerModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
          <button type="button" @click="executeDeleteCustomer" :disabled="mutating" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all cursor-pointer disabled:opacity-50">
            {{ mutating ? 'Menghapus...' : 'Hapus Customer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
