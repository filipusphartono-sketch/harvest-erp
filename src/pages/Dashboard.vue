<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '../firebase'
import { collection, doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'

// Sub-components
import OverviewTab from '../components/dashboard/OverviewTab.vue'
import UsersTab from '../components/dashboard/UsersTab.vue'
import CustomerTab from '../components/dashboard/CustomerTab.vue'
import SupplierTab from '../components/dashboard/SupplierTab.vue'
import DaftarKemasTab from '../components/dashboard/DaftarKemasTab.vue'
import DaftarKotaTab from '../components/dashboard/DaftarKotaTab.vue'
import BahanBakuTab from '../components/dashboard/BahanBakuTab.vue'
import SupplierBahanTab from '../components/dashboard/SupplierBahanTab.vue'
import BarangJadiTab from '../components/dashboard/BarangJadiTab.vue'
import ProduksiHppTab from '../components/dashboard/ProduksiHppTab.vue'

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
    case 'produksi_barang_jadi': return 'Produksi - Barang Jadi'
    case 'produksi_hpp': return 'Produksi - Harga Pokok Produksi'
    case 'pengaturan_suppliyer_bahan': return 'Pengaturan - Suppliyer-Bahan'
    case 'pengaturan_bahan_baku': return 'Pengaturan - Bahan Baku'
    case 'pengaturan_barang_jadi': return 'Pengaturan - Barang Jadi'
    case 'pengaturan_daftar_kota': return 'Pengaturan - Daftar Kota'
    case 'pengaturan_daftar_kemas': return 'Pengaturan - Daftar Kemas'
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
const showMobileSidebar = ref(false)

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

interface Supplier {
  id: string
  name: string
  address: string
  googleMap: string
  createdAt: string
}

const customers = ref<Customer[]>([])
const loadingCustomers = ref(false)

const suppliers = ref<Supplier[]>([])
const loadingSuppliers = ref(false)

interface City {
  id: string
  cityName: string
  createdAt: string
}

const cities = ref<City[]>([])
const loadingCities = ref(false)

interface PackagingOption {
  id: string
  name: string
  createdAt: string
}

const packagingOptions = ref<PackagingOption[]>([])
const loadingPackagings = ref(false)

interface RawMaterial {
  id: string
  name: string
  packaging: string
  weight: number
  createdAt: string
}

const rawMaterials = ref<RawMaterial[]>([])
const loadingRawMaterials = ref(false)

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

const supplierMaterials = ref<SupplierMaterial[]>([])
const loadingSupplierMaterials = ref(false)

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

    if (fetchedUsers.length <= 1 && !localStorage.getItem('harvest_erp_users_seeded')) {
      const mockUsersToSeed = [
        { uid: 'mock1', fullName: 'Budi Santoso', email: 'budi@harvest-erp.com', role: 'Karyawan', status: 'Aktif', createdAt: '15 Juni 2026' },
        { uid: 'mock2', fullName: 'Siti Rahma', email: 'siti@harvest-erp.com', role: 'Karyawan', status: 'Aktif', createdAt: '12 Juni 2026' }
      ]
      
      Promise.all(mockUsersToSeed.map(mu => 
        setDoc(doc(db, 'users', mu.uid), {
          uid: mu.uid,
          fullName: mu.fullName,
          email: mu.email,
          role: mu.role,
          status: mu.status,
          createdAt: serverTimestamp()
        })
      )).then(() => {
        localStorage.setItem('harvest_erp_users_seeded', 'true')
      }).catch(err => {
        console.error('Error seeding mock users:', err)
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

let unsubscribeCustomers: (() => void) | null = null
let unsubscribeSuppliers: (() => void) | null = null

const fetchCustomers = () => {
  loadingCustomers.value = true
  if (unsubscribeCustomers) unsubscribeCustomers()
  
  unsubscribeCustomers = onSnapshot(collection(db, 'customers'), (querySnapshot) => {
    const fetched: Customer[] = []
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
      
      let itemsList: CustomerItem[] = []
      if (Array.isArray(data.items)) {
        itemsList = data.items.map((i: any) => ({
          itemName: i.itemName || '',
          price: Number(i.price) || 0
        }))
      } else if (data.item) {
        itemsList = [{
          itemName: data.item,
          price: Number(data.price) || 0
        }]
      }
      
      fetched.push({
        id: doc.id,
        name: data.name || '',
        address: data.address || '',
        city: data.city || '',
        googleMap: data.googleMap || '',
        items: itemsList,
        createdAt: dateString
      })
    })
    customers.value = fetched
    loadingCustomers.value = false
  }, (error) => {
    console.error('Error fetching customers:', error)
    loadingCustomers.value = false
  })
}

const fetchSuppliers = () => {
  loadingSuppliers.value = true
  if (unsubscribeSuppliers) unsubscribeSuppliers()
  
  unsubscribeSuppliers = onSnapshot(collection(db, 'suppliyers'), (querySnapshot) => {
    const fetched: Supplier[] = []
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
      fetched.push({
        id: doc.id,
        name: data.name || '',
        address: data.address || '',
        googleMap: data.googleMap || '',
        createdAt: dateString
      })
    })
    suppliers.value = fetched
    loadingSuppliers.value = false
  }, (error) => {
    console.error('Error fetching suppliers:', error)
    loadingSuppliers.value = false
  })
}

let unsubscribeCities: (() => void) | null = null

const fetchCities = () => {
  loadingCities.value = true
  if (unsubscribeCities) unsubscribeCities()
  
  unsubscribeCities = onSnapshot(collection(db, 'cities'), (querySnapshot) => {
    const fetched: City[] = []
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
      fetched.push({
        id: doc.id,
        cityName: data.cityName || '',
        createdAt: dateString
      })
    })
    
    if (fetched.length === 0) {
      const defaultCities = ['Salatiga', 'Semarang', 'Jakarta', 'Bandung', 'Surabaya']
      Promise.all(defaultCities.map(city => {
        const docRef = doc(collection(db, 'cities'))
        return setDoc(docRef, {
          cityName: city,
          createdAt: serverTimestamp()
        })
      })).then(() => {
        localStorage.setItem('harvest_erp_cities_seeded', 'true')
      }).catch(err => {
        console.error('Error seeding cities:', err)
      })
    }
    
    cities.value = fetched
    loadingCities.value = false
  }, (error) => {
    console.error('Error fetching cities:', error)
    loadingCities.value = false
  })
}

let unsubscribePackagings: (() => void) | null = null

const fetchPackagings = () => {
  loadingPackagings.value = true
  if (unsubscribePackagings) unsubscribePackagings()
  
  unsubscribePackagings = onSnapshot(collection(db, 'kemasan'), (querySnapshot) => {
    const fetched: PackagingOption[] = []
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
      fetched.push({
        id: doc.id,
        name: data.name || '',
        createdAt: dateString
      })
    })
    
    if (fetched.length === 0) {
      const defaultPackagings = ['Sak', 'Karung', 'Jerigen', 'Box', 'Pcs']
      Promise.all(defaultPackagings.map(pkg => {
        const docRef = doc(collection(db, 'kemasan'))
        return setDoc(docRef, {
          name: pkg,
          createdAt: serverTimestamp()
        })
      })).then(() => {
        localStorage.setItem('harvest_erp_packagings_seeded', 'true')
      }).catch(err => {
        console.error('Error seeding packagings:', err)
      })
    }
    
    packagingOptions.value = fetched
    loadingPackagings.value = false
  }, (error) => {
    console.error('Error fetching packagings:', error)
    loadingPackagings.value = false
  })
}

let unsubscribeRawMaterials: (() => void) | null = null

const fetchRawMaterials = () => {
  loadingRawMaterials.value = true
  if (unsubscribeRawMaterials) unsubscribeRawMaterials()
  
  unsubscribeRawMaterials = onSnapshot(collection(db, 'bahan_baku'), (querySnapshot) => {
    const fetched: RawMaterial[] = []
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
      fetched.push({
        id: doc.id,
        name: data.name || '',
        packaging: data.packaging || '',
        weight: Number(data.weight) || 0,
        createdAt: dateString
      })
    })
    rawMaterials.value = fetched
    loadingRawMaterials.value = false
  }, (error) => {
    console.error('Error fetching raw materials:', error)
    loadingRawMaterials.value = false
  })
}

let unsubscribeSupplierMaterials: (() => void) | null = null

const fetchSupplierMaterials = () => {
  loadingSupplierMaterials.value = true
  if (unsubscribeSupplierMaterials) unsubscribeSupplierMaterials()
  
  unsubscribeSupplierMaterials = onSnapshot(collection(db, 'supplier_bahan'), (querySnapshot) => {
    const fetched: SupplierMaterial[] = []
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
      fetched.push({
        id: doc.id,
        supplierId: data.supplierId || '',
        supplierName: data.supplierName || '',
        materialId: data.materialId || '',
        materialName: data.materialName || '',
        materialPackaging: data.materialPackaging || '',
        materialWeight: Number(data.materialWeight) || 0,
        price: Number(data.price) || 0,
        createdAt: dateString
      })
    })
    supplierMaterials.value = fetched
    loadingSupplierMaterials.value = false
  }, (error) => {
    console.error('Error fetching supplier materials:', error)
    loadingSupplierMaterials.value = false
  })
}

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

const products = ref<ProductMaster[]>([])
const loadingProducts = ref(false)
const hppRecipes = ref<HppRecipe[]>([])
const loadingHppRecipes = ref(false)

let unsubscribeProducts: (() => void) | null = null
let unsubscribeHppRecipes: (() => void) | null = null

const fetchFinishedGoods = () => {
  loadingProducts.value = true
  loadingHppRecipes.value = true
  if (unsubscribeProducts) unsubscribeProducts()
  if (unsubscribeHppRecipes) unsubscribeHppRecipes()
  
  unsubscribeProducts = onSnapshot(collection(db, 'barang_jadi'), (querySnapshot) => {
    const prods: ProductMaster[] = []
    querySnapshot.forEach((doc) => {
      prods.push({ id: doc.id, ...doc.data() } as ProductMaster)
    })
    products.value = prods
    loadingProducts.value = false
  }, (error) => {
    console.error("Error fetching products: ", error)
    loadingProducts.value = false
  })

  unsubscribeHppRecipes = onSnapshot(collection(db, 'hpp_recipes'), (querySnapshot) => {
    const recipes: HppRecipe[] = []
    querySnapshot.forEach((doc) => {
      recipes.push({ id: doc.id, ...doc.data() } as HppRecipe)
    })
    hppRecipes.value = recipes
    loadingHppRecipes.value = false
  }, (error) => {
    console.error("Error fetching HPP recipes: ", error)
    loadingHppRecipes.value = false
  })
}

// Helpers for Finished Goods mapping
const getProductRecipeCount = (productId: string) => {
  return hppRecipes.value.filter(r => r.productId === productId).length
}

const getBaseName = (name: string) => {
  return name.replace(/\s*[\d.,]+\s*(kg|g|gr|gram|liter|ltr|pcs|lbr|pack|pk)?\s*$/i, '').trim()
}

const getBaseMaterialPricePerUnit = (baseName: string) => {
  const matchingMaterials = rawMaterials.value.filter(
    m => getBaseName(m.name).toLowerCase() === baseName.toLowerCase()
  )
  const allPrices: number[] = []
  
  matchingMaterials.forEach(mat => {
    const pricesForMat = supplierMaterials.value
      .filter(sm => sm.materialId === mat.id && sm.materialWeight > 0)
      .map(sm => sm.price / sm.materialWeight)
    
    if (pricesForMat.length > 0) {
      allPrices.push(...pricesForMat)
    } else {
      const fallbackPrices = supplierMaterials.value
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
  const mat = rawMaterials.value.find(m => m.id === materialId)
  const baseName = mat ? getBaseName(mat.name) : materialId
  return getBaseMaterialPricePerUnit(baseName)
}

const calculateRecipeMaterialCost = (recipe: RecipeItem[]) => {
  if (!recipe) return 0
  return recipe.reduce((total, r) => {
    return total + (r.quantity * getMaterialPricePerUnit(r.materialId))
  }, 0)
}

const getProductMaxHpp = (productId: string) => {
  const recipes = hppRecipes.value.filter(r => r.productId === productId)
  if (recipes.length === 0) return 0
  const hpps = recipes.map(r => {
    const materialCost = calculateRecipeMaterialCost(r.recipe)
    const totalCost = materialCost + (Number(r.printingLaborCost) || 0) + (Number(r.packagingLaborCost) || 0) + (Number(r.overheadCost) || 0)
    return totalCost / (r.batchSize || 1)
  })
  return Math.max(...hpps)
}

onMounted(() => {
  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUser.value = {
        displayName: user.displayName || 'Administrator',
        email: user.email || 'admin@harvest-erp.com'
      }
      fetchUsers()
      fetchCustomers()
      fetchSuppliers()
      fetchCities()
      fetchRawMaterials()
      fetchPackagings()
      fetchSupplierMaterials()
      fetchFinishedGoods()
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
  if (unsubscribeUsers) unsubscribeUsers()
  if (unsubscribeCustomers) unsubscribeCustomers()
  if (unsubscribeSuppliers) unsubscribeSuppliers()
  if (unsubscribeCities) unsubscribeCities()
  if (unsubscribeRawMaterials) unsubscribeRawMaterials()
  if (unsubscribePackagings) unsubscribePackagings()
  if (unsubscribeSupplierMaterials) unsubscribeSupplierMaterials()
  if (unsubscribeProducts) unsubscribeProducts()
  if (unsubscribeHppRecipes) unsubscribeHppRecipes()
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
        
        <div class="flex flex-col items-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none">
          <img src="/Harvest Logo.png" alt="Harvest Logo" class="h-10 w-auto object-contain brightness-110" />
          <span class="text-[7px] font-medium text-slate-400 tracking-wider mt-1 uppercase">Enterprise Resource Planning</span>
        </div>
        
        <div class="flex items-center gap-4 z-10">
          <div class="text-right">
            <p class="text-xs font-semibold text-slate-200">{{ currentUser.displayName }}</p>
            <p class="text-[9px] text-slate-500 font-mono mt-0.5">{{ currentUser.email }}</p>
          </div>
          <button 
            @click="handleLogout"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 text-xs font-medium text-red-400 border border-red-900/30 hover:border-red-900/50 rounded-lg transition-all duration-300 cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile Header -->
    <header class="md:hidden bg-slate-900 border-b border-slate-800/80 h-14 flex items-center justify-between px-4 shrink-0 relative z-50 shadow-md">
      <button 
        @click="showMobileSidebar = true"
        class="p-2 -ml-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
        aria-label="Open sidebar"
      >
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      <div class="flex items-center gap-2 select-none">
        <img src="/Harvest Logo.png" alt="Harvest Logo" class="h-7 w-auto object-contain" />
        <span class="text-[9px] font-semibold tracking-wider text-purple-400 uppercase">ERP</span>
      </div>
      
      <button 
        @click="handleLogout"
        class="p-2 -mr-2 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
        title="Logout"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </header>

    <!-- Desktop Sidebar + Main Content Layout -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Desktop Sidebar -->
      <aside class="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 shrink-0 select-none">
        <!-- Navigation Links -->
        <div class="flex-1 overflow-y-auto py-6 px-4 space-y-7">
          <!-- Main Module -->
          <div class="space-y-1">
            <p class="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Modul Utama</p>
            <button 
              @click="currentTab = 'dashboard'"
              class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl border border-transparent transition-all cursor-pointer"
              :class="currentTab === 'dashboard' ? 'bg-purple-600/20 text-purple-400 border-purple-500/30 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
            >
              <svg class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>
            <button 
              @click="currentTab = 'penjualan'"
              class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl border border-transparent transition-all cursor-pointer"
              :class="currentTab === 'penjualan' ? 'bg-purple-600/20 text-purple-400 border-purple-500/30 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
            >
              <svg class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Penjualan
            </button>
            <button 
              @click="currentTab = 'pembelian'"
              class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl border border-transparent transition-all cursor-pointer"
              :class="currentTab === 'pembelian' ? 'bg-purple-600/20 text-purple-400 border-purple-500/30 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
            >
              <svg class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Pembelian
            </button>
          </div>

          <!-- Modul Produksi (Dropdown) -->
          <div class="space-y-1">
            <button 
              @click="toggleMenu('produksi')"
              class="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-xl border border-transparent transition-all cursor-pointer"
              :class="currentTab.startsWith('produksi_') ? 'bg-purple-600/20 text-purple-400 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
            >
              <span class="flex items-center gap-3">
                <svg class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Produksi
              </span>
              <svg class="h-3.5 w-3.5 transition-transform duration-200" :class="{ 'rotate-180': openMenus.produksi }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-show="openMenus.produksi" class="pl-9 pr-2 py-1 space-y-1">
              <button 
                @click="currentTab = 'produksi_kelola_cetak'; openMenus.produksi = false"
                class="w-full text-left py-1.5 text-xs transition-colors cursor-pointer"
                :class="currentTab === 'produksi_kelola_cetak' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Kelola Cetak
              </button>
              <button 
                @click="currentTab = 'produksi_kelola_kemas'; openMenus.produksi = false"
                class="w-full text-left py-1.5 text-xs transition-colors cursor-pointer"
                :class="currentTab === 'produksi_kelola_kemas' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Kelola Kemas
              </button>
              <button 
                @click="currentTab = 'produksi_barang_jadi'; openMenus.produksi = false"
                class="w-full text-left py-1.5 text-xs transition-colors cursor-pointer"
                :class="currentTab === 'produksi_barang_jadi' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Barang Jadi
              </button>
              <button 
                @click="currentTab = 'produksi_hpp'; openMenus.produksi = false"
                class="w-full text-left py-1.5 text-xs transition-colors cursor-pointer"
                :class="currentTab === 'produksi_hpp' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Harga Pokok (HPP)
              </button>
            </div>
          </div>

          <!-- Modul Gudang (Dropdown) -->
          <div class="space-y-1">
            <button 
              @click="toggleMenu('gudang')"
              class="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-xl border border-transparent transition-all cursor-pointer"
              :class="currentTab.startsWith('gudang_') ? 'bg-purple-600/20 text-purple-400 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
            >
              <span class="flex items-center gap-3">
                <svg class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Gudang
              </span>
              <svg class="h-3.5 w-3.5 transition-transform duration-200" :class="{ 'rotate-180': openMenus.gudang }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-show="openMenus.gudang" class="pl-9 pr-2 py-1 space-y-1">
              <button 
                @click="currentTab = 'gudang_barang_jadi'; openMenus.gudang = false"
                class="w-full text-left py-1.5 text-xs transition-colors cursor-pointer"
                :class="currentTab === 'gudang_barang_jadi' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Barang Jadi
              </button>
              <button 
                @click="currentTab = 'gudang_bahan_baku'; openMenus.gudang = false"
                class="w-full text-left py-1.5 text-xs transition-colors cursor-pointer"
                :class="currentTab === 'gudang_bahan_baku' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Bahan Baku
              </button>
            </div>
          </div>

          <!-- Modul Gaji/Salary (Dropdown) -->
          <div class="space-y-1">
            <button 
              @click="toggleMenu('salary')"
              class="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-xl border border-transparent transition-all cursor-pointer"
              :class="currentTab.startsWith('salary_') ? 'bg-purple-600/20 text-purple-400 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
            >
              <span class="flex items-center gap-3">
                <svg class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16V5" />
                </svg>
                Salary / Gaji
              </span>
              <svg class="h-3.5 w-3.5 transition-transform duration-200" :class="{ 'rotate-180': openMenus.salary }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-show="openMenus.salary" class="pl-9 pr-2 py-1 space-y-1">
              <button 
                @click="currentTab = 'salary_cetak'; openMenus.salary = false"
                class="w-full text-left py-1.5 text-xs transition-colors cursor-pointer"
                :class="currentTab === 'salary_cetak' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Gaji Cetak
              </button>
              <button 
                @click="currentTab = 'salary_kemas'; openMenus.salary = false"
                class="w-full text-left py-1.5 text-xs transition-colors cursor-pointer"
                :class="currentTab === 'salary_kemas' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Gaji Kemas
              </button>
            </div>
          </div>

          <!-- Modul Pengaturan (Dropdown) -->
          <div class="space-y-1">
            <button 
              @click="toggleMenu('pengaturan')"
              class="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-xl border border-transparent transition-all cursor-pointer"
              :class="currentTab.startsWith('pengaturan_') || currentTab === 'users' || currentTab === 'customer' || currentTab === 'suppliyer' || currentTab === 'harga_pokok_produksi' ? 'bg-purple-600/20 text-purple-400 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
            >
              <span class="flex items-center gap-3">
                <svg class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Pengaturan
              </span>
              <svg class="h-3.5 w-3.5 transition-transform duration-200" :class="{ 'rotate-180': openMenus.pengaturan }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-show="openMenus.pengaturan" class="pl-9 pr-2 py-1 space-y-1">
              <button 
                @click="currentTab = 'users'; openMenus.pengaturan = false"
                class="w-full text-left py-1.5 text-xs transition-colors cursor-pointer"
                :class="currentTab === 'users' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Daftar Users
              </button>
              <button 
                @click="currentTab = 'customer'; openMenus.pengaturan = false"
                class="w-full text-left py-1.5 text-xs transition-colors cursor-pointer"
                :class="currentTab === 'customer' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Daftar Customer
              </button>
              <button 
                @click="currentTab = 'suppliyer'; openMenus.pengaturan = false"
                class="w-full text-left py-1.5 text-xs transition-colors cursor-pointer"
                :class="currentTab === 'suppliyer' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Daftar Supplier
              </button>
              <button 
                @click="currentTab = 'pengaturan_suppliyer_bahan'; openMenus.pengaturan = false"
                class="w-full text-left py-1.5 text-xs transition-colors cursor-pointer"
                :class="currentTab === 'pengaturan_suppliyer_bahan' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Supplier - Bahan
              </button>
              <button 
                @click="currentTab = 'pengaturan_bahan_baku'; openMenus.pengaturan = false"
                class="w-full text-left py-1.5 text-xs transition-colors cursor-pointer"
                :class="currentTab === 'pengaturan_bahan_baku' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Bahan Baku
              </button>
              <button 
                @click="currentTab = 'pengaturan_daftar_kota'; openMenus.pengaturan = false"
                class="w-full text-left py-1.5 text-xs transition-colors cursor-pointer"
                :class="currentTab === 'pengaturan_daftar_kota' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Daftar Kota
              </button>
              <button 
                @click="currentTab = 'pengaturan_daftar_kemas'; openMenus.pengaturan = false"
                class="w-full text-left py-1.5 text-xs transition-colors cursor-pointer"
                :class="currentTab === 'pengaturan_daftar_kemas' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Tipe Kemasan
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- Mobile Sidebar Overlay & Drawer -->
      <div v-show="showMobileSidebar" class="md:hidden fixed inset-0 z-50 flex">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showMobileSidebar = false"></div>
        
        <!-- Drawer Content -->
        <aside class="relative flex flex-col w-72 max-w-[80vw] bg-slate-900 border-r border-slate-800 h-full p-6 select-none z-10">
          <div class="flex items-center justify-between mb-8">
            <div class="flex items-center gap-2">
              <img src="/Harvest Logo.png" alt="Harvest Logo" class="h-8 w-auto object-contain" />
              <span class="text-[10px] font-bold text-slate-400 tracking-wider">ENTERPRISE SYSTEM</span>
            </div>
            <button @click="showMobileSidebar = false" class="text-slate-400 hover:text-white cursor-pointer" aria-label="Close sidebar">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div class="flex-1 overflow-y-auto space-y-6 -mx-2 px-2">
            <!-- Mobile Navigation List -->
            <button 
              @click="currentTab = 'dashboard'; showMobileSidebar = false"
              class="w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-xl border transition-all cursor-pointer"
              :class="currentTab === 'dashboard' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
            >
              Dashboard
            </button>
            <button 
              @click="currentTab = 'penjualan'; showMobileSidebar = false"
              class="w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-xl border transition-all cursor-pointer"
              :class="currentTab === 'penjualan' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
            >
              Penjualan
            </button>
            <button 
              @click="currentTab = 'pembelian'; showMobileSidebar = false"
              class="w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-xl border transition-all cursor-pointer"
              :class="currentTab === 'pembelian' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
            >
              Pembelian
            </button>

            <!-- Produksi Mobile -->
            <div>
              <p class="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">PRODUKSI</p>
              <div class="space-y-1">
                <button 
                  @click="currentTab = 'produksi_kelola_cetak'; showMobileSidebar = false"
                  class="w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
                  :class="currentTab === 'produksi_kelola_cetak' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                >
                  Kelola Cetak
                </button>
                <button 
                  @click="currentTab = 'produksi_kelola_kemas'; showMobileSidebar = false"
                  class="w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
                  :class="currentTab === 'produksi_kelola_kemas' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                >
                  Kelola Kemas
                </button>
                <button 
                  @click="currentTab = 'produksi_barang_jadi'; showMobileSidebar = false"
                  class="w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
                  :class="currentTab === 'produksi_barang_jadi' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                >
                  Barang Jadi
                </button>
                <button 
                  @click="currentTab = 'produksi_hpp'; showMobileSidebar = false"
                  class="w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
                  :class="currentTab === 'produksi_hpp' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                >
                  Harga Pokok (HPP)
                </button>
              </div>
            </div>

            <!-- Gudang Mobile -->
            <div>
              <p class="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">GUDANG</p>
              <div class="space-y-1">
                <button 
                  @click="currentTab = 'gudang_barang_jadi'; showMobileSidebar = false"
                  class="w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
                  :class="currentTab === 'gudang_barang_jadi' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                >
                  Barang Jadi
                </button>
                <button 
                  @click="currentTab = 'gudang_bahan_baku'; showMobileSidebar = false"
                  class="w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
                  :class="currentTab === 'gudang_bahan_baku' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                >
                  Bahan Baku
                </button>
              </div>
            </div>

            <!-- Salary Mobile -->
            <div>
              <p class="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">SALARY / GAJI</p>
              <div class="space-y-1">
                <button 
                  @click="currentTab = 'salary_cetak'; showMobileSidebar = false"
                  class="w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
                  :class="currentTab === 'salary_cetak' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                >
                  Gaji Cetak
                </button>
                <button 
                  @click="currentTab = 'salary_kemas'; showMobileSidebar = false"
                  class="w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
                  :class="currentTab === 'salary_kemas' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                >
                  Gaji Kemas
                </button>
              </div>
            </div>

            <!-- Pengaturan Mobile -->
            <div>
              <p class="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">PENGATURAN SYSTEM</p>
              <div class="space-y-1">
                <button 
                  @click="currentTab = 'users'; showMobileSidebar = false"
                  class="w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
                  :class="currentTab === 'users' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                >
                  Kelola Users
                </button>
                <button 
                  @click="currentTab = 'customer'; showMobileSidebar = false"
                  class="w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
                  :class="currentTab === 'customer' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                >
                  Kelola Customer
                </button>
                <button 
                  @click="currentTab = 'suppliyer'; showMobileSidebar = false"
                  class="w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
                  :class="currentTab === 'suppliyer' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                >
                  Kelola Supplier
                </button>
                <button 
                  @click="currentTab = 'pengaturan_suppliyer_bahan'; showMobileSidebar = false"
                  class="w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
                  :class="currentTab === 'pengaturan_suppliyer_bahan' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                >
                  Supplier - Bahan
                </button>
                <button 
                  @click="currentTab = 'pengaturan_bahan_baku'; showMobileSidebar = false"
                  class="w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
                  :class="currentTab === 'pengaturan_bahan_baku' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                >
                  Bahan Baku
                </button>
                <button 
                  @click="currentTab = 'pengaturan_daftar_kota'; showMobileSidebar = false"
                  class="w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
                  :class="currentTab === 'pengaturan_daftar_kota' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                >
                  Kelola Kota
                </button>
                <button 
                  @click="currentTab = 'pengaturan_daftar_kemas'; showMobileSidebar = false"
                  class="w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer"
                  :class="currentTab === 'pengaturan_daftar_kemas' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                >
                  Tipe Kemasan
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
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

        <!-- TAB 1: DASHBOARD OVERVIEW -->
        <OverviewTab
          v-if="currentTab === 'dashboard'"
          :stats="stats"
          :activities="activities"
        />

        <!-- TAB 2: USERS -->
        <UsersTab
          v-else-if="currentTab === 'users'"
          :users="users"
          :loading="loadingUsers"
          :current-user-id="auth.currentUser?.uid || ''"
          @update-display-name="name => currentUser.displayName = name"
        />

        <!-- TAB 3: CUSTOMER -->
        <CustomerTab
          v-else-if="currentTab === 'customer'"
          :customers="customers"
          :cities="cities"
          :loading="loadingCustomers"
        />

        <!-- TAB 4: DAFTAR KEMASAN -->
        <DaftarKemasTab
          v-else-if="currentTab === 'pengaturan_daftar_kemas'"
          :packaging-options="packagingOptions"
          :loading="loadingPackagings"
        />

        <!-- TAB 5: DAFTAR KOTA -->
        <DaftarKotaTab
          v-else-if="currentTab === 'pengaturan_daftar_kota'"
          :cities="cities"
          :loading="loadingCities"
        />

        <!-- TAB 6: SUPPLIER -->
        <SupplierTab
          v-else-if="currentTab === 'suppliyer'"
          :suppliers="suppliers"
          :loading="loadingSuppliers"
        />

        <!-- TAB 7: BAHAN BAKU -->
        <BahanBakuTab
          v-else-if="currentTab === 'pengaturan_bahan_baku'"
          :raw-materials="rawMaterials"
          :packaging-options="packagingOptions"
          :loading="loadingRawMaterials"
        />

        <!-- TAB 8: SUPPLIER BAHAN -->
        <SupplierBahanTab
          v-else-if="currentTab === 'pengaturan_suppliyer_bahan'"
          :supplier-materials="supplierMaterials"
          :suppliers="suppliers"
          :raw-materials="rawMaterials"
          :loading="loadingSupplierMaterials"
        />

        <!-- TAB 9: BARANG JADI -->
        <BarangJadiTab
          v-else-if="currentTab === 'produksi_barang_jadi'"
          :products="products"
          :loading="loadingProducts"
          :get-product-recipe-count="getProductRecipeCount"
          :get-product-max-hpp="getProductMaxHpp"
        />

        <!-- TAB 10: RECIPES (HPP) -->
        <ProduksiHppTab
          v-else-if="currentTab === 'produksi_hpp'"
          :hpp-recipes="hppRecipes"
          :products="products"
          :raw-materials="rawMaterials"
          :supplier-materials="supplierMaterials"
          :loading="loadingHppRecipes"
        />

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
  </div>
</template>
