<script setup lang="ts">
import { ref } from 'vue'
import { db } from '../../firebase'
import { doc, setDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore'

interface City {
  id: string
  cityName: string
  createdAt: string
}

defineProps<{
  cities: City[]
  loading: boolean
}>()

// States
const mutating = ref(false)
const cityError = ref('')

// Modals
const showAddCityModal = ref(false)
const showEditCityModal = ref(false)
const showDeleteCityModal = ref(false)

const editingCity = ref<City | null>(null)
const deletingCity = ref<City | null>(null)

const cityForm = ref({
  cityName: ''
})

const resetCityForm = () => {
  cityForm.value = {
    cityName: ''
  }
  cityError.value = ''
}

// Handlers
const saveAddCity = async () => {
  mutating.value = true
  cityError.value = ''
  try {
    const docRef = doc(collection(db, 'cities'))
    await setDoc(docRef, {
      cityName: cityForm.value.cityName,
      createdAt: serverTimestamp()
    })
    showAddCityModal.value = false
    resetCityForm()
  } catch (error: any) {
    console.error('Error adding city:', error)
    cityError.value = error.message || 'Gagal menambahkan kota.'
  } finally {
    mutating.value = false
  }
}

const openEditCity = (city: City) => {
  editingCity.value = city
  cityForm.value = {
    cityName: city.cityName
  }
  showEditCityModal.value = true
}

const saveEditCity = async () => {
  if (!editingCity.value) return
  mutating.value = true
  cityError.value = ''
  try {
    const docRef = doc(db, 'cities', editingCity.value.id)
    await setDoc(docRef, {
      cityName: cityForm.value.cityName
    }, { merge: true })
    showEditCityModal.value = false
    editingCity.value = null
    resetCityForm()
  } catch (error: any) {
    console.error('Error editing city:', error)
    cityError.value = error.message || 'Gagal mengubah data kota.'
  } finally {
    mutating.value = false
  }
}

const openDeleteCity = (city: City) => {
  deletingCity.value = city
  showDeleteCityModal.value = true
}

const executeDeleteCity = async () => {
  if (!deletingCity.value) return
  mutating.value = true
  try {
    await deleteDoc(doc(db, 'cities', deletingCity.value.id))
    showDeleteCityModal.value = false
    deletingCity.value = null
  } catch (error) {
    console.error('Error deleting city:', error)
    alert('Gagal menghapus kota.')
  } finally {
    mutating.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-white tracking-tight">Daftar Kota</h2>
        <p class="text-sm text-slate-400 mt-1">Kelola daftar kota wilayah operasional dan pengiriman.</p>
      </div>
      <div>
        <button
          @click="showAddCityModal = true; resetCityForm()"
          class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Kota
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64 bg-slate-900/20 border border-slate-800 rounded-2xl">
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Memuat daftar kota...</p>
      </div>
    </div>

    <!-- Cities Table Card -->
    <div v-else class="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800/80 bg-slate-900/60 text-slate-300 text-xs font-semibold uppercase tracking-wider">
              <th class="py-4 px-6">Nama Kota</th>
              <th class="py-4 px-6">Tanggal Ditambahkan</th>
              <th class="py-4 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/50 text-sm text-slate-300">
            <tr 
              v-for="city in cities" 
              :key="city.id"
              class="hover:bg-slate-800/20 transition-colors"
            >
              <td class="py-4 px-6 font-medium text-white">{{ city.cityName }}</td>
              <td class="py-4 px-6 text-slate-400">{{ city.createdAt }}</td>
              <td class="py-4 px-6 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button 
                    @click="openEditCity(city)"
                    class="p-2 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-all cursor-pointer"
                    title="Edit Kota"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    @click="openDeleteCity(city)"
                    class="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-all cursor-pointer"
                    title="Hapus Kota"
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

    <!-- Add City Modal -->
    <div v-if="showAddCityModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showAddCityModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-4">Tambah Kota Baru</h3>
        <form @submit.prevent="saveAddCity" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nama Kota</label>
            <input v-model="cityForm.cityName" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" placeholder="Nama Kota (cth: Yogyakarta)" />
          </div>
          <div v-if="cityError" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ cityError }}
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" @click="showAddCityModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
            <button type="submit" :disabled="mutating" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50">
              {{ mutating ? 'Menyimpan...' : 'Simpan Kota' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit City Modal -->
    <div v-if="showEditCityModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showEditCityModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-4">Edit Nama Kota</h3>
        <form @submit.prevent="saveEditCity" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nama Kota</label>
            <input v-model="cityForm.cityName" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" />
          </div>
          <div v-if="cityError" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ cityError }}
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" @click="showEditCityModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
            <button type="submit" :disabled="mutating" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50">
              {{ mutating ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete City Modal -->
    <div v-if="showDeleteCityModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showDeleteCityModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-2">Hapus Kota</h3>
        <p class="text-sm text-slate-400 mb-6">
          Apakah Anda yakin ingin menghapus kota <span class="text-white font-semibold">{{ deletingCity?.cityName }}</span>? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div class="flex items-center justify-end gap-3">
          <button type="button" @click="showDeleteCityModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
          <button type="button" @click="executeDeleteCity" :disabled="mutating" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all cursor-pointer disabled:opacity-50">
            {{ mutating ? 'Menghapus...' : 'Hapus Kota' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
