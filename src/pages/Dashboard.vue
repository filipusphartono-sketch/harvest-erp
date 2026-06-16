<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '../firebase'
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore'

const router = useRouter()
const currentTab = ref('dashboard')
const currentUser = ref({ displayName: 'Administrator', email: 'admin@harvest-erp.com' })

const openMenus = ref({
  gudang: false,
  salary: false,
  pengaturan: false,
  produksi: false
})

const toggleMenu = (menu: 'gudang' | 'salary' | 'pengaturan' | 'produksi') => {
  if (menu === 'gudang') {
    openMenus.value.gudang = !openMenus.value.gudang
    openMenus.value.salary = false
    openMenus.value.pengaturan = false
    openMenus.value.produksi = false
  } else if (menu === 'salary') {
    openMenus.value.salary = !openMenus.value.salary
    openMenus.value.gudang = false
    openMenus.value.pengaturan = false
    openMenus.value.produksi = false
  } else if (menu === 'produksi') {
    openMenus.value.produksi = !openMenus.value.produksi
    openMenus.value.gudang = false
    openMenus.value.salary = false
    openMenus.value.pengaturan = false
  } else {
    openMenus.value.pengaturan = !openMenus.value.pengaturan
    openMenus.value.gudang = false
    openMenus.value.salary = false
    openMenus.value.produksi = false
  }
}

const getTabTitle = (tab: string) => {
  switch (tab) {
    case 'dashboard': return 'Dashboard Utama'
    case 'penjualan': return 'Modul Penjualan'
    case 'pembelian': return 'Modul Pembelian'
    case 'produksi': return 'Modul Produksi'
    case 'produksi_kelola_cetak': return 'Produksi - Kelola Cetak'
    case 'produksi_kelola_kemas': return 'Produksi - Kelola Kemas'
    case 'gudang_barang_jadi': return 'Gudang - Barang Jadi'
    case 'gudang_bahan_baku': return 'Gudang - Bahan Baku'
    case 'salary_cetak': return 'Salary - Cetak'
    case 'salary_kemas': return 'Salary - Kemas'
    case 'users': return 'Kelola Pengguna (Users)'
    case 'customer': return 'Kelola Pelanggan (Customer)'
    case 'suppliyer': return 'Kelola Supplier (Suppliyer)'
    case 'harga_pokok_produksi': return 'Harga Pokok Produksi'
    case 'pengaturan_suppliyer_bahan': return 'Pengaturan - Suppliyer-Bahan'
    case 'pengaturan_bahan_baku': return 'Pengaturan - Bahan Baku'
    case 'pengaturan_barang_jadi': return 'Pengaturan - Barang Jadi'
    default: return 'Harvest ERP'
  }
}

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

const users = ref<UserProfile[]>([])
const loadingUsers = ref(false)

// Edit / Delete states
const showMobileSidebar = ref(false)
const showEditModal = ref(false)
const editingUser = ref<UserProfile | null>(null)
const editForm = ref({ fullName: '', role: 'Karyawan', status: 'Aktif', phoneNumber: '', address: '' })

const showDeleteModal = ref(false)
const deletingUser = ref<UserProfile | null>(null)
const mutating = ref(false)

const stats = ref([
  { name: 'Total Pendapatan', value: 'Rp 0', change: '0%', changeType: 'positive' },
  { name: 'Pesanan Baru', value: '0', change: '0%', changeType: 'positive' },
  { name: 'Total Pelanggan', value: '0', change: '0%', changeType: 'positive' }
])

interface Activity {
  id: string
  text: string
  time: string
  type: 'info' | 'success' | 'warning' | 'error'
}
const activities = ref<Activity[]>([])

let unsubscribeUsers: (() => void) | null = null

const fetchUsers = () => {
  loadingUsers.value = true
  
  if (unsubscribeUsers) {
    unsubscribeUsers()
  }

  // Use onSnapshot for instant cache loading and real-time synchronization
  unsubscribeUsers = onSnapshot(collection(db, 'users'), (querySnapshot) => {
    const fetchedUsers: UserProfile[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      let dateString = 'Baru saja'
      if (data.createdAt) {
        if (typeof data.createdAt.toDate === 'function') {
          dateString = data.createdAt.toDate().toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        } else {
          dateString = data.createdAt
        }
      }
      fetchedUsers.push({
        uid: doc.id,
        fullName: data.fullName || 'Tanpa Nama',
        email: data.email || '',
        role: data.role || 'Karyawan',
        status: data.status || 'Aktif',
        phoneNumber: data.phoneNumber || '-',
        address: data.address || '-',
        createdAt: dateString,
        isMock: false
      })
    })

    // Seed mock users in the background if they are not already seeded in Firestore
    if (fetchedUsers.length <= 1 && !localStorage.getItem('harvest_erp_users_seeded')) {
      const mockUsersToSeed = [
        { uid: 'mock1', fullName: 'Budi Santoso', email: 'budi@harvest-erp.com', role: 'Karyawan', status: 'Aktif', createdAt: '15 Juni 2026' },
        { uid: 'mock2', fullName: 'Siti Rahma', email: 'siti@harvest-erp.com', role: 'Karyawan', status: 'Aktif', createdAt: '12 Juni 2026' }
      ]
      
      // Perform background seeding - Firestore onSnapshot will auto-receive the updates
      Promise.all(mockUsersToSeed.map(mu => 
        setDoc(doc(db, 'users', mu.uid), {
          fullName: mu.fullName,
          email: mu.email,
          role: mu.role,
          status: mu.status,
          createdAt: mu.createdAt
        })
      )).then(() => {
        localStorage.setItem('harvest_erp_users_seeded', 'true')
      }).catch(err => {
        console.error('Error background seeding:', err)
      })
    }

    const loggedInUserInList = fetchedUsers.some(u => u.email === currentUser.value.email)
    if (!loggedInUserInList) {
      fetchedUsers.unshift({
        uid: auth.currentUser?.uid || 'current',
        fullName: currentUser.value.displayName,
        email: currentUser.value.email,
        role: 'Administrator',
        status: 'Aktif',
        createdAt: 'Hari ini',
        isMock: false
      })
    }

    users.value = fetchedUsers
    loadingUsers.value = false
  }, (error) => {
    console.error('Error fetching users:', error)
    loadingUsers.value = false
    users.value = [
      { uid: auth.currentUser?.uid || 'current', fullName: currentUser.value.displayName, email: currentUser.value.email, role: 'Administrator', status: 'Aktif', createdAt: 'Hari ini', isMock: false }
    ]
  })
}

// Handler functions for Edit/Delete UI
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
    // Update in Firestore
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
    
    // Update local state list
    const index = users.value.findIndex(u => u.uid === editingUser.value?.uid)
    if (index !== -1) {
      users.value[index].fullName = editForm.value.fullName
      users.value[index].role = editForm.value.role
      users.value[index].status = editForm.value.status
      users.value[index].phoneNumber = editForm.value.phoneNumber
      users.value[index].address = editForm.value.address
    }
    
    // If we updated the currently logged in user, update top-right navbar
    if (editingUser.value.uid === auth.currentUser?.uid) {
      currentUser.value.displayName = editForm.value.fullName
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
    // Delete from Firestore
    await deleteDoc(doc(db, 'users', deletingUser.value.uid))
    
    // Remove from local list
    users.value = users.value.filter(u => u.uid !== deletingUser.value?.uid)
    
    showDeleteModal.value = false
    deletingUser.value = null
  } catch (error) {
    console.error('Error deleting user:', error)
    alert('Gagal menghapus pengguna.')
  } finally {
    mutating.value = false
  }
}

onMounted(() => {
  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUser.value = {
        displayName: user.displayName || 'Administrator',
        email: user.email || 'admin@harvest-erp.com'
      }
      fetchUsers()
    } else {
      router.push('/')
    }
  })
})

const handleLogout = () => {
  auth.signOut().then(() => {
    router.push('/')
  })
}

onUnmounted(() => {
  if (unsubscribeUsers) {
    unsubscribeUsers()
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
    <!-- Desktop Top Navbar (Wide Screens) -->
    <header class="hidden md:block bg-slate-900 border-b border-slate-800 shadow-md shrink-0 relative z-50">
      <!-- Row 1: Brand & User Profile -->
      <div class="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between relative">
        <!-- Spacer for layout balance -->
        <div class="w-48 hidden md:block"></div>
        
        <div class="flex flex-col items-center absolute left-1/2 -translate-x-1/2 select-none">
          <span class="font-black text-xl text-white tracking-widest leading-none">HARVEST</span>
          <span class="text-[8px] font-medium text-slate-400 tracking-wider mt-1 uppercase">Enterprise Resource Planning</span>
        </div>
        
        <div class="flex items-center gap-4 z-10">
          <div class="text-right">
            <p class="text-xs font-semibold text-white">{{ currentUser.displayName }}</p>
            <p class="text-[10px] text-slate-400">{{ currentUser.email }}</p>
          </div>
          <button
            @click="handleLogout"
            class="px-3 py-1.5 border border-slate-700 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-xs font-medium transition-all cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </div>
      
      <!-- Row 2: Navigation Links -->
      <div class="bg-slate-900/60 border-t border-slate-800/80 backdrop-blur-md">
        <div class="max-w-7xl mx-auto px-6 h-12 flex items-center justify-center gap-2">
          <button
            @click="currentTab = 'dashboard'"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-base font-medium transition-all cursor-pointer shrink-0"
            :class="currentTab === 'dashboard' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
          >
            Dashboard
          </button>
          
          <button
            @click="currentTab = 'penjualan'"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-base font-medium transition-all cursor-pointer shrink-0"
            :class="currentTab === 'penjualan' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
          >
            Penjualan
          </button>
          
          <button
            @click="currentTab = 'pembelian'"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-base font-medium transition-all cursor-pointer shrink-0"
            :class="currentTab === 'pembelian' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
          >
            Pembelian
          </button>
          
          <!-- Produksi Dropdown -->
          <div class="relative" @mouseleave="openMenus.produksi = false">
            <button
              @mouseenter="openMenus.produksi = true; openMenus.gudang = false; openMenus.salary = false; openMenus.pengaturan = false"
              @click="toggleMenu('produksi')"
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-base font-medium transition-all cursor-pointer shrink-0"
              :class="currentTab.startsWith('produksi_') ? 'bg-purple-600/20 text-purple-400 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
            >
              <span>Produksi</span>
              <svg class="h-3.5 w-3.5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="openMenus.produksi ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
              </svg>
            </button>
            <div v-if="openMenus.produksi" class="absolute left-0 w-44 rounded-lg bg-slate-900 border border-slate-800 shadow-xl z-50 py-1">
              <button
                @click="currentTab = 'produksi_kelola_cetak'; openMenus.produksi = false"
                class="w-full text-left px-4 py-2 text-[15px] hover:bg-slate-800 transition-colors"
                :class="currentTab === 'produksi_kelola_cetak' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Kelola Cetak
              </button>
              <button
                @click="currentTab = 'produksi_kelola_kemas'; openMenus.produksi = false"
                class="w-full text-left px-4 py-2 text-[15px] hover:bg-slate-800 transition-colors"
                :class="currentTab === 'produksi_kelola_kemas' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Kelola Kemas
              </button>
            </div>
          </div>
          
          <!-- Gudang Dropdown -->
          <div class="relative" @mouseleave="openMenus.gudang = false">
            <button
              @mouseenter="openMenus.gudang = true; openMenus.salary = false; openMenus.pengaturan = false; openMenus.produksi = false"
              @click="toggleMenu('gudang')"
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-base font-medium transition-all cursor-pointer shrink-0"
              :class="currentTab.startsWith('gudang_') ? 'bg-purple-600/20 text-purple-400 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
            >
              <span>Gudang</span>
              <svg class="h-3.5 w-3.5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="openMenus.gudang ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
              </svg>
            </button>
            <div v-if="openMenus.gudang" class="absolute left-0 w-44 rounded-lg bg-slate-900 border border-slate-800 shadow-xl z-50 py-1">
              <button
                @click="currentTab = 'gudang_barang_jadi'; openMenus.gudang = false"
                class="w-full text-left px-4 py-2 text-[15px] hover:bg-slate-800 transition-colors"
                :class="currentTab === 'gudang_barang_jadi' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Barang Jadi
              </button>
              <button
                @click="currentTab = 'gudang_bahan_baku'; openMenus.gudang = false"
                class="w-full text-left px-4 py-2 text-[15px] hover:bg-slate-800 transition-colors"
                :class="currentTab === 'gudang_bahan_baku' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Bahan Baku
              </button>
            </div>
          </div>
          
          <!-- Salary Dropdown -->
          <div class="relative" @mouseleave="openMenus.salary = false">
            <button
              @mouseenter="openMenus.salary = true; openMenus.gudang = false; openMenus.pengaturan = false; openMenus.produksi = false"
              @click="toggleMenu('salary')"
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-base font-medium transition-all cursor-pointer shrink-0"
              :class="currentTab.startsWith('salary_') ? 'bg-purple-600/20 text-purple-400 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
            >
              <span>Salary</span>
              <svg class="h-3.5 w-3.5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="openMenus.salary ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
              </svg>
            </button>
            <div v-if="openMenus.salary" class="absolute left-0 w-44 rounded-lg bg-slate-900 border border-slate-800 shadow-xl z-50 py-1">
              <button
                @click="currentTab = 'salary_cetak'; openMenus.salary = false"
                class="w-full text-left px-4 py-2 text-[15px] hover:bg-slate-800 transition-colors"
                :class="currentTab === 'salary_cetak' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Salary Cetak
              </button>
              <button
                @click="currentTab = 'salary_kemas'; openMenus.salary = false"
                class="w-full text-left px-4 py-2 text-[15px] hover:bg-slate-800 transition-colors"
                :class="currentTab === 'salary_kemas' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Salary Kemas
              </button>
            </div>
          </div>
          
          <!-- Pengaturan Dropdown -->
          <div class="relative" @mouseleave="openMenus.pengaturan = false">
            <button
              @mouseenter="openMenus.pengaturan = true; openMenus.gudang = false; openMenus.salary = false; openMenus.produksi = false"
              @click="toggleMenu('pengaturan')"
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-base font-medium transition-all cursor-pointer shrink-0"
              :class="currentTab.startsWith('pengaturan_') || currentTab === 'users' || currentTab === 'customer' || currentTab === 'suppliyer' || currentTab === 'harga_pokok_produksi' ? 'bg-purple-600/20 text-purple-400 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
            >
              <span>Pengaturan</span>
              <svg class="h-3.5 w-3.5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="openMenus.pengaturan ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
              </svg>
            </button>
            <div v-if="openMenus.pengaturan" class="absolute left-0 w-44 rounded-lg bg-slate-900 border border-slate-800 shadow-xl z-50 py-1">
              <button
                @click="currentTab = 'users'; openMenus.pengaturan = false"
                class="w-full text-left px-4 py-2 text-[15px] hover:bg-slate-800 transition-colors"
                :class="currentTab === 'users' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Users
              </button>
              <button
                @click="currentTab = 'customer'; openMenus.pengaturan = false"
                class="w-full text-left px-4 py-2 text-[15px] hover:bg-slate-800 transition-colors"
                :class="currentTab === 'customer' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Customer
              </button>
              <button
                @click="currentTab = 'suppliyer'; openMenus.pengaturan = false"
                class="w-full text-left px-4 py-2 text-[15px] hover:bg-slate-800 transition-colors"
                :class="currentTab === 'suppliyer' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Suppliyer
              </button>
              <button
                @click="currentTab = 'harga_pokok_produksi'; openMenus.pengaturan = false"
                class="w-full text-left px-4 py-2 text-[15px] hover:bg-slate-800 transition-colors"
                :class="currentTab === 'harga_pokok_produksi' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Harga Pokok Produksi
              </button>
              <button
                @click="currentTab = 'pengaturan_suppliyer_bahan'; openMenus.pengaturan = false"
                class="w-full text-left px-4 py-2 text-[15px] hover:bg-slate-800 transition-colors"
                :class="currentTab === 'pengaturan_suppliyer_bahan' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Suppliyer-Bahan
              </button>
              <button
                @click="currentTab = 'pengaturan_bahan_baku'; openMenus.pengaturan = false"
                class="w-full text-left px-4 py-2 text-[15px] hover:bg-slate-800 transition-colors"
                :class="currentTab === 'pengaturan_bahan_baku' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Bahan Baku
              </button>
              <button
                @click="currentTab = 'pengaturan_barang_jadi'; openMenus.pengaturan = false"
                class="w-full text-left px-4 py-2 text-[15px] hover:bg-slate-800 transition-colors"
                :class="currentTab === 'pengaturan_barang_jadi' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Barang Jadi
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Mobile Top Header (Small Screens Only) -->
    <header class="md:hidden h-16 border-b border-slate-800 bg-slate-900/40 backdrop-blur-md flex items-center justify-between px-4 shrink-0">
      <div class="flex items-center gap-3">
        <button 
          @click="showMobileSidebar = true" 
          class="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer"
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div class="flex flex-col">
          <span class="font-bold text-white tracking-widest text-base leading-none">HARVEST</span>
          <span class="text-[7px] font-medium text-slate-400 tracking-wider mt-0.5 uppercase">Enterprise Resource Planning</span>
        </div>
      </div>
      <div class="text-right">
        <p class="text-xs font-semibold text-white">{{ currentUser.displayName }}</p>
      </div>
    </header>

    <!-- Mobile Sidebar Drawer (Overlay) -->
    <div v-if="showMobileSidebar" class="fixed inset-0 z-50 flex md:hidden">
      <!-- Dark backdrop overlay -->
      <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showMobileSidebar = false"></div>
      
      <!-- Drawer Menu Box -->
      <aside class="relative w-64 bg-slate-900 flex flex-col h-full border-r border-slate-800 z-10 transition-all duration-300">
        <div class="p-6 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="font-bold text-lg text-white">HARVEST</span>
          </div>
          <!-- Close button -->
          <button @click="showMobileSidebar = false" class="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all cursor-pointer">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
          <button
            @click="currentTab = 'dashboard'; showMobileSidebar = false"
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer text-left"
            :class="currentTab === 'dashboard' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
          >
            Dashboard
          </button>
          <button
            @click="currentTab = 'penjualan'; showMobileSidebar = false"
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer text-left"
            :class="currentTab === 'penjualan' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
          >
            Penjualan
          </button>
          <button
            @click="currentTab = 'pembelian'; showMobileSidebar = false"
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer text-left"
            :class="currentTab === 'pembelian' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
          >
            Pembelian
          </button>
          <!-- Produksi Group -->
          <div class="space-y-1">
            <button
              @click="toggleMenu('produksi')"
              class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-all cursor-pointer text-left"
            >
              <span>Produksi</span>
              <svg class="h-4 w-4 transform transition-transform duration-200" :class="openMenus.produksi ? 'rotate-90' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div v-show="openMenus.produksi" class="pl-4 space-y-1">
              <button
                @click="currentTab = 'produksi_kelola_cetak'; showMobileSidebar = false"
                class="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left"
                :class="currentTab === 'produksi_kelola_cetak' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
              >
                Kelola Cetak
              </button>
              <button
                @click="currentTab = 'produksi_kelola_kemas'; showMobileSidebar = false"
                class="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left"
                :class="currentTab === 'produksi_kelola_kemas' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
              >
                Kelola Kemas
              </button>
            </div>
          </div>
          
          <!-- Gudang Group -->
          <div class="space-y-1">
            <button
              @click="toggleMenu('gudang')"
              class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-all cursor-pointer text-left"
            >
              <span>Gudang</span>
              <svg class="h-4 w-4 transform transition-transform duration-200" :class="openMenus.gudang ? 'rotate-90' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div v-show="openMenus.gudang" class="pl-4 space-y-1">
              <button
                @click="currentTab = 'gudang_barang_jadi'; showMobileSidebar = false"
                class="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left"
                :class="currentTab === 'gudang_barang_jadi' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
              >
                Barang Jadi
              </button>
              <button
                @click="currentTab = 'gudang_bahan_baku'; showMobileSidebar = false"
                class="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left"
                :class="currentTab === 'gudang_bahan_baku' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
              >
                Bahan Baku
              </button>
            </div>
          </div>
  
          <!-- Salary Group -->
          <div class="space-y-1">
            <button
              @click="toggleMenu('salary')"
              class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-all cursor-pointer text-left"
            >
              <span>Salary</span>
              <svg class="h-4 w-4 transform transition-transform duration-200" :class="openMenus.salary ? 'rotate-90' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
             <div v-show="openMenus.salary" class="pl-4 space-y-1">
              <button
                @click="currentTab = 'salary_cetak'; showMobileSidebar = false"
                class="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left"
                :class="currentTab === 'salary_cetak' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
              >
                Salary Cetak
              </button>
              <button
                @click="currentTab = 'salary_kemas'; showMobileSidebar = false"
                class="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left"
                :class="currentTab === 'salary_kemas' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
              >
                Salary Kemas
              </button>
            </div>
          </div>
  
          <!-- Pengaturan Group -->
          <div class="space-y-1">
            <button
              @click="toggleMenu('pengaturan')"
              class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-all cursor-pointer text-left"
            >
              <span>Pengaturan</span>
              <svg class="h-4 w-4 transform transition-transform duration-200" :class="openMenus.pengaturan ? 'rotate-90' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div v-show="openMenus.pengaturan" class="pl-4 space-y-1">
              <button
                @click="currentTab = 'users'; showMobileSidebar = false"
                class="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left"
                :class="currentTab === 'users' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
              >
                Users
              </button>
              <button
                @click="currentTab = 'customer'; showMobileSidebar = false"
                class="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left"
                :class="currentTab === 'customer' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
              >
                Customer
              </button>
              <button
                @click="currentTab = 'suppliyer'; showMobileSidebar = false"
                class="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left"
                :class="currentTab === 'suppliyer' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
              >
                Suppliyer
              </button>
              <button
                @click="currentTab = 'harga_pokok_produksi'; showMobileSidebar = false"
                class="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left"
                :class="currentTab === 'harga_pokok_produksi' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
              >
                Harga Pokok Produksi
              </button>
              <button
                @click="currentTab = 'pengaturan_suppliyer_bahan'; showMobileSidebar = false"
                class="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left"
                :class="currentTab === 'pengaturan_suppliyer_bahan' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
              >
                Suppliyer-Bahan
              </button>
              <button
                @click="currentTab = 'pengaturan_bahan_baku'; showMobileSidebar = false"
                class="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left"
                :class="currentTab === 'pengaturan_bahan_baku' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
              >
                Bahan Baku
              </button>
              <button
                @click="currentTab = 'pengaturan_barang_jadi'; showMobileSidebar = false"
                class="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left"
                :class="currentTab === 'pengaturan_barang_jadi' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
              >
                Barang Jadi
              </button>
            </div>
          </div>
        </nav>
        <div class="p-4 border-t border-slate-800">
          <button
            @click="handleLogout"
            class="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-700 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-sm font-medium transition-all cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </aside>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Main content -->
      <main class="flex-1 overflow-y-auto p-8">
        <!-- Page Title Header (For both Desktop and Mobile context) -->
        <div class="mb-6 flex justify-between items-center">
          <h1 class="text-xl md:text-2xl font-bold text-white tracking-tight">
            {{ getTabTitle(currentTab) }}
          </h1>
        </div>
        <!-- TAB 1: DASHBOARD -->
        <div v-if="currentTab === 'dashboard'" class="space-y-8">
          <!-- Stats cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              v-for="stat in stats"
              :key="stat.name"
              class="bg-slate-900/50 border border-slate-800/60 p-6 rounded-2xl shadow-sm hover:border-slate-700 transition-all duration-300"
            >
              <p class="text-sm text-slate-400 font-medium">{{ stat.name }}</p>
              <div class="mt-2 flex items-baseline justify-between">
                <span class="text-2xl font-bold text-white">{{ stat.value }}</span>
                <span class="text-xs font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                  {{ stat.change }}
                </span>
              </div>
            </div>
          </div>

          <!-- Placeholder Section for ERP modules -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Main Chart Area (placeholder) -->
            <div class="lg:col-span-2 bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl">
              <h2 class="text-lg font-semibold text-white mb-4">Grafik Penjualan Bulanan</h2>
              <div class="h-64 bg-slate-950/80 rounded-xl flex items-center justify-center text-slate-500 border border-slate-800/50">
                [ Visualisasi Grafik Penjualan ]
              </div>
            </div>

            <!-- Activity log -->
            <div class="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl">
              <h2 class="text-lg font-semibold text-white mb-4">Aktivitas Terakhir</h2>
              <div v-if="activities.length > 0" class="space-y-4">
                <div 
                  v-for="activity in activities" 
                  :key="activity.id"
                  class="flex items-start gap-3 text-sm"
                >
                  <span 
                    class="h-2 w-2 rounded-full mt-1.5 shrink-0"
                    :class="{
                      'bg-blue-500': activity.type === 'info',
                      'bg-green-500': activity.type === 'success',
                      'bg-yellow-500': activity.type === 'warning',
                      'bg-red-500': activity.type === 'error'
                    }"
                  ></span>
                  <div>
                    <p class="text-slate-200 font-medium">{{ activity.text }}</p>
                    <p class="text-xs text-slate-400">{{ activity.time }}</p>
                  </div>
                </div>
              </div>
              <div v-else class="h-64 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
                <svg class="h-8 w-8 mb-2 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-xs">Belum ada aktivitas</span>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: USERS (Tabel Pengguna) -->
        <div v-else-if="currentTab === 'users'" class="space-y-6">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 class="text-2xl font-bold text-white tracking-tight">Daftar Pengguna</h2>
              <p class="text-sm text-slate-400 mt-1">Kelola akun pengguna dan hak akses sistem ERP.</p>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="loadingUsers" class="flex items-center justify-center h-64 bg-slate-900/20 border border-slate-800 rounded-2xl">
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
        </div>

        <!-- OTHER TABS PLACEHOLDER -->
        <div v-else class="h-[60vh] flex flex-col items-center justify-center text-slate-400 bg-slate-900/20 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-md">
          <div class="p-4 rounded-full bg-purple-500/10 text-purple-400 mb-4 animate-pulse-subtle">
            <svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h3 class="text-xl font-bold text-white mb-2">{{ getTabTitle(currentTab) }}</h3>
          <p class="text-sm text-slate-500 max-w-sm text-center">Modul ini sedang dalam tahap pengembangan dan akan segera hadir.</p>
        </div>
      </main>
    </div>

    <!-- Edit User Modal -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Overlay -->
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showEditModal = false"></div>
      
      <!-- Modal Box -->
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
      <!-- Overlay -->
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showDeleteModal = false"></div>
      
      <!-- Modal Box -->
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
  </div>
</template>
