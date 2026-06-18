<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db, app } from '../firebase'
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'

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

// Edit / Delete states
const showMobileSidebar = ref(false)
const showEditModal = ref(false)
const editingUser = ref<UserProfile | null>(null)
const editForm = ref({ fullName: '', role: 'Karyawan', status: 'Aktif', phoneNumber: '', address: '' })

const showDeleteModal = ref(false)
const deletingUser = ref<UserProfile | null>(null)
const mutating = ref(false)

// Add user states
const showAddModal = ref(false)
const addError = ref('')
const addForm = ref({
  fullName: '',
  email: '',
  phoneNumber: '',
  address: '',
  password: '',
  role: 'Karyawan',
  status: 'Aktif'
})
const resettingAddForm = () => {
  addForm.value = {
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    password: '',
    role: 'Karyawan',
    status: 'Aktif'
  }
  addError.value = ''
}

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

// Customer states
const customers = ref<Customer[]>([])
const loadingCustomers = ref(false)
const showAddCustomerModal = ref(false)
const showEditCustomerModal = ref(false)
const showDeleteCustomerModal = ref(false)
const editingCustomer = ref<Customer | null>(null)
const deletingCustomer = ref<Customer | null>(null)
const customerError = ref('')
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

// Supplier states
const suppliers = ref<Supplier[]>([])
const loadingSuppliers = ref(false)
const showAddSupplierModal = ref(false)
const showEditSupplierModal = ref(false)
const showDeleteSupplierModal = ref(false)
const editingSupplier = ref<Supplier | null>(null)
const deletingSupplier = ref<Supplier | null>(null)
const supplierError = ref('')
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

interface City {
  id: string
  cityName: string
  createdAt: string
}

// City states
const cities = ref<City[]>([])
const loadingCities = ref(false)
const showAddCityModal = ref(false)
const showEditCityModal = ref(false)
const showDeleteCityModal = ref(false)
const editingCity = ref<City | null>(null)
const deletingCity = ref<City | null>(null)
const cityError = ref('')
const cityForm = ref({
  cityName: ''
})
const resetCityForm = () => {
  cityForm.value = {
    cityName: ''
  }
  cityError.value = ''
}

interface PackagingOption {
  id: string
  name: string
  createdAt: string
}

// Packaging states
const packagingOptions = ref<PackagingOption[]>([])
const loadingPackagings = ref(false)
const showAddPackagingModal = ref(false)
const showEditPackagingModal = ref(false)
const showDeletePackagingModal = ref(false)
const editingPackaging = ref<PackagingOption | null>(null)
const deletingPackaging = ref<PackagingOption | null>(null)
const packagingError = ref('')
const packagingForm = ref({
  name: ''
})
const resetPackagingForm = () => {
  packagingForm.value = {
    name: ''
  }
  packagingError.value = ''
}


interface RawMaterial {
  id: string
  name: string
  packaging: string
  weight: number
  createdAt: string
}

// Raw Material states
const rawMaterials = ref<RawMaterial[]>([])
const loadingRawMaterials = ref(false)
const showAddMaterialModal = ref(false)
const showEditMaterialModal = ref(false)
const showDeleteMaterialModal = ref(false)
const editingMaterial = ref<RawMaterial | null>(null)
const deletingMaterial = ref<RawMaterial | null>(null)
const materialError = ref('')
const searchMaterialQuery = ref('')

const filteredAndSortedRawMaterials = computed(() => {
  let result = rawMaterials.value;
  if (searchMaterialQuery.value.trim()) {
    const query = searchMaterialQuery.value.toLowerCase();
    result = result.filter(mat => mat.name.toLowerCase().includes(query));
  }
  return result.slice().sort((a, b) => a.name.localeCompare(b.name));
})

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

// Supplier Material states
const supplierMaterials = ref<SupplierMaterial[]>([])
const loadingSupplierMaterials = ref(false)
const showAddSupplierMaterialModal = ref(false)
const showEditSupplierMaterialModal = ref(false)
const showDeleteSupplierMaterialModal = ref(false)
const editingSupplierMaterial = ref<SupplierMaterial | null>(null)
const deletingSupplierMaterial = ref<SupplierMaterial | null>(null)
const supplierMaterialError = ref('')
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

const saveAdd = async () => {
  mutating.value = true
  addError.value = ''
  try {
    const apps = getApps()
    const secondaryApp = apps.find(a => a.name === 'Secondary') || initializeApp(app.options, 'Secondary')
    const secondaryAuth = getAuth(secondaryApp)
    
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      addForm.value.email,
      addForm.value.password
    )
    
    if (userCredential.user) {
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        fullName: addForm.value.fullName,
        email: addForm.value.email,
        phoneNumber: addForm.value.phoneNumber,
        address: addForm.value.address,
        role: addForm.value.role,
        status: addForm.value.status,
        createdAt: serverTimestamp()
      })
    }
    
    await secondaryAuth.signOut()
    
    showAddModal.value = false
    resettingAddForm()
  } catch (error: any) {
    console.error('Error adding user:', error)
    if (error.code === 'auth/email-already-in-use') {
      addError.value = 'Email sudah terdaftar.'
    } else if (error.code === 'auth/weak-password') {
      addError.value = 'Kata sandi minimal 6 karakter.'
    } else if (error.code === 'auth/invalid-email') {
      addError.value = 'Format email tidak valid.'
    } else {
      addError.value = error.message || 'Gagal menambahkan pengguna.'
    }
  } finally {
    mutating.value = false
  }
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

// Customer handlers
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

// Supplier handlers
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
    
    // Auto-seed default cities if collection is empty
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

// City CRUD handlers
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
    
    // Auto-seed default packaging if collection is empty
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

// Packaging CRUD handlers
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

// Raw Material CRUD handlers
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

// Supplier-Material CRUD handlers
const saveAddSupplierMaterial = async () => {
  mutating.value = true
  supplierMaterialError.value = ''
  try {
    const selectedSupplier = suppliers.value.find(s => s.id === supplierMaterialForm.value.supplierId)
    const selectedMaterial = rawMaterials.value.find(m => m.id === supplierMaterialForm.value.materialId)
    
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
    const selectedSupplier = suppliers.value.find(s => s.id === supplierMaterialForm.value.supplierId)
    const selectedMaterial = rawMaterials.value.find(m => m.id === supplierMaterialForm.value.materialId)
    
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
const hppRecipes = ref<HppRecipe[]>([])
// --- Product Master & HPP Recipe States ---
const showAddProductModal = ref(false)
const showEditProductModal = ref(false)
const showDeleteProductModal = ref(false)
const editingProduct = ref<ProductMaster | null>(null)
const deletingProduct = ref<ProductMaster | null>(null)
const productError = ref('')
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

const showAddRecipeModal = ref(false)
const showEditRecipeModal = ref(false)
const showDeleteRecipeModal = ref(false)
const editingRecipe = ref<HppRecipe | null>(null)
const deletingRecipe = ref<HppRecipe | null>(null)
const recipeError = ref('')
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
    const selectedProd = products.value.find(p => p.id === newVal)
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


let unsubscribeProducts: (() => void) | null = null
let unsubscribeHppRecipes: (() => void) | null = null

const fetchFinishedGoods = () => {
  if (unsubscribeProducts) unsubscribeProducts()
  if (unsubscribeHppRecipes) unsubscribeHppRecipes()
  
  unsubscribeProducts = onSnapshot(collection(db, 'barang_jadi'), (querySnapshot) => {
    const prods: ProductMaster[] = []
    querySnapshot.forEach((doc) => {
      prods.push({ id: doc.id, ...doc.data() } as ProductMaster)
    })
    products.value = prods
  }, (error) => {
    console.error("Error fetching products: ", error)
  })

  unsubscribeHppRecipes = onSnapshot(collection(db, 'hpp_recipes'), (querySnapshot) => {
    const recipes: HppRecipe[] = []
    querySnapshot.forEach((doc) => {
      recipes.push({ id: doc.id, ...doc.data() } as HppRecipe)
    })
    hppRecipes.value = recipes
  }, (error) => {
    console.error("Error fetching HPP recipes: ", error)
  })
}



// --- Product Master CRUD ---
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

// --- HPP Recipe CRUD ---
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
        let baseName = r.materialId;
        const mat = rawMaterials.value.find(m => m.id === r.materialId);
        if (mat) baseName = mat.name;
        return { materialId: baseName, quantity: r.quantity };
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

// --- HPP & Product Helper Functions ---
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

const getProductRecipeCount = (productId: string) => {
  return hppRecipes.value.filter(r => r.productId === productId).length
}

const getProductNameById = (productId: string) => {
  const p = products.value.find(prod => prod.id === productId)
  return p ? p.name : 'Produk Tidak Ditemukan'
}


const getBaseName = (name: string) => {
  return name.replace(/\s*[\d.,]+\s*(kg|g|gr|gram|liter|ltr|pcs|lbr|pack|pk)?\s*$/i, '').trim();
}

const uniqueRawMaterials = computed(() => {
  const seen = new Set<string>()
  const result: { name: string; packaging: string }[] = []
  
  rawMaterials.value.forEach(mat => {
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
  return recipe.reduce((total, r) => {
    return total + (r.quantity * getMaterialPricePerUnit(r.materialId))
  }, 0)
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
  if (unsubscribeUsers) {
    unsubscribeUsers()
  }
  if (unsubscribeCustomers) {
    unsubscribeCustomers()
  }
  if (unsubscribeSuppliers) {
    unsubscribeSuppliers()
  }
  if (unsubscribeCities) {
    unsubscribeCities()
  }
  if (unsubscribeRawMaterials) {
    unsubscribeRawMaterials()
  }
  if (unsubscribePackagings) {
    unsubscribePackagings()
  }
  if (unsubscribeSupplierMaterials) {
    unsubscribeSupplierMaterials()
  }
  if (unsubscribeProducts) {
    unsubscribeProducts()
  }
  if (unsubscribeHppRecipes) {
    unsubscribeHppRecipes()
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
          <img src="/Harvest Logo.png" alt="Harvest Logo" class="h-10 w-auto object-contain brightness-110" />
          <span class="text-[7px] font-medium text-slate-400 tracking-wider mt-1 uppercase">Enterprise Resource Planning</span>
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
            <div v-if="openMenus.produksi" class="absolute left-0 w-48 rounded-lg bg-slate-900 border border-slate-800 shadow-xl z-50 py-1">
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
              <button
                @click="currentTab = 'produksi_barang_jadi'; openMenus.produksi = false"
                class="w-full text-left px-4 py-2 text-[15px] hover:bg-slate-800 transition-colors"
                :class="currentTab === 'produksi_barang_jadi' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Barang Jadi
              </button>
              <button
                @click="currentTab = 'produksi_hpp'; openMenus.produksi = false"
                class="w-full text-left px-4 py-2 text-[15px] hover:bg-slate-800 transition-colors"
                :class="currentTab === 'produksi_hpp' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Harga Pokok Produksi
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
                @click="currentTab = 'pengaturan_daftar_kota'; openMenus.pengaturan = false"
                class="w-full text-left px-4 py-2 text-[15px] hover:bg-slate-800 transition-colors"
                :class="currentTab === 'pengaturan_daftar_kota' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Daftar Kota
              </button>
              <button
                @click="currentTab = 'pengaturan_daftar_kemas'; openMenus.pengaturan = false"
                class="w-full text-left px-4 py-2 text-[15px] hover:bg-slate-800 transition-colors"
                :class="currentTab === 'pengaturan_daftar_kemas' ? 'text-purple-400 font-semibold' : 'text-slate-300'"
              >
                Daftar Kemas
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
          <img src="/Harvest Logo.png" alt="Harvest Logo" class="h-9 w-auto object-contain self-start brightness-110" />
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
          <div class="flex items-center gap-2">
            <img src="/Harvest Logo.png" alt="Harvest Logo" class="h-9 w-auto object-contain brightness-110" />
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
              <button
                @click="currentTab = 'produksi_barang_jadi'; showMobileSidebar = false"
                class="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left"
                :class="currentTab === 'produksi_barang_jadi' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
              >
                Barang Jadi
              </button>
              <button
                @click="currentTab = 'produksi_hpp'; showMobileSidebar = false"
                class="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left"
                :class="currentTab === 'produksi_hpp' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
              >
                Harga Pokok Produksi
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
                @click="currentTab = 'pengaturan_daftar_kota'; showMobileSidebar = false"
                class="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left"
                :class="currentTab === 'pengaturan_daftar_kota' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
              >
                Daftar Kota
              </button>
              <button
                @click="currentTab = 'pengaturan_daftar_kemas'; showMobileSidebar = false"
                class="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left"
                :class="currentTab === 'pengaturan_daftar_kemas' ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
              >
                Daftar Kemas
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
            <div>
              <button
                @click="showAddModal = true; resettingAddForm()"
                class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Tambah User
              </button>
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

        <!-- TAB: CUSTOMER (Tabel Pelanggan) -->
        <div v-else-if="currentTab === 'customer'" class="space-y-6">
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
          <div v-if="loadingCustomers" class="flex items-center justify-center h-64 bg-slate-900/20 border border-slate-800 rounded-2xl">
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
        </div>

        <!-- TAB: DAFTAR KEMASAN (Pengaturan Kemasan) -->
        <div v-else-if="currentTab === 'pengaturan_daftar_kemas'" class="space-y-6">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 class="text-2xl font-bold text-white tracking-tight">Daftar Kemasan</h2>
              <p class="text-sm text-slate-400 mt-1">Kelola daftar tipe kemasan untuk bahan baku.</p>
            </div>
            <div>
              <button
                @click="showAddPackagingModal = true; resetPackagingForm()"
                class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Tambah Kemasan
              </button>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="loadingPackagings" class="flex items-center justify-center h-64 bg-slate-900/20 border border-slate-800 rounded-2xl">
            <div class="flex flex-col items-center gap-3">
              <div class="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p class="text-sm text-slate-400">Memuat daftar kemasan...</p>
            </div>
          </div>

          <!-- Packaging Table Card -->
          <div v-else class="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-slate-800/80 bg-slate-900/60 text-slate-300 text-xs font-semibold uppercase tracking-wider">
                    <th class="py-4 px-6">Nama Kemasan</th>
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
                          title="Edit Kemasan"
                        >
                          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          @click="openDeletePackaging(pkg)"
                          class="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-all cursor-pointer"
                          title="Hapus Kemasan"
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

        <!-- TAB: SUPPLIER (Tabel Supplier) -->
        <div v-else-if="currentTab === 'suppliyer'" class="space-y-6">
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
          <div v-if="loadingSuppliers" class="flex items-center justify-center h-64 bg-slate-900/20 border border-slate-800 rounded-2xl">
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
        </div>

        <!-- TAB: DAFTAR KOTA (Pengaturan Kota) -->
        <div v-else-if="currentTab === 'pengaturan_daftar_kota'" class="space-y-6">
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
          <div v-if="loadingCities" class="flex items-center justify-center h-64 bg-slate-900/20 border border-slate-800 rounded-2xl">
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
        </div>

        <!-- TAB: BAHAN BAKU (Pengaturan Bahan Baku) -->
        <div v-else-if="currentTab === 'pengaturan_bahan_baku'" class="space-y-6">
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
          <div v-if="loadingRawMaterials" class="flex items-center justify-center h-64 bg-slate-900/20 border border-slate-800 rounded-2xl">
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
        </div>

        <!-- TAB: SUPPLIER BAHAN (Pengaturan Supplier Bahan) -->
        <div v-else-if="currentTab === 'pengaturan_suppliyer_bahan'" class="space-y-6">
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
          <div v-if="loadingSupplierMaterials" class="flex items-center justify-center h-64 bg-slate-900/20 border border-slate-800 rounded-2xl">
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
        </div>

        <!-- TAB: BARANG JADI (MASTER) -->
        <div v-else-if="currentTab === 'produksi_barang_jadi'" class="space-y-6">
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

          <!-- Products Table Card -->
          <div class="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
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
        </div>

        <!-- TAB: HARGA POKOK PRODUKSI (RECIPES) -->
        <div v-else-if="currentTab === 'produksi_hpp'" class="space-y-6">
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

          <!-- Recipes Table Card -->
          <div class="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
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

    <!-- Add User Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Overlay -->
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showAddModal = false"></div>
      
      <!-- Modal Box -->
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-4">Tambah Pengguna Baru</h3>
        <form @submit.prevent="saveAdd" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap</label>
            <input 
              v-model="addForm.fullName" 
              type="text" 
              required
              placeholder="Nama Lengkap"
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Alamat Email</label>
            <input 
              v-model="addForm.email" 
              type="email" 
              required
              placeholder="email@example.com"
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Kata Sandi</label>
            <input 
              v-model="addForm.password" 
              type="password" 
              required
              placeholder="Minimal 6 karakter"
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">No Telepon</label>
            <input 
              v-model="addForm.phoneNumber" 
              type="tel" 
              required
              placeholder="Contoh: 08123456789"
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Alamat</label>
            <input 
              v-model="addForm.address" 
              type="text" 
              required
              placeholder="Alamat Lengkap"
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Peran (Role)</label>
            <select 
              v-model="addForm.role"
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
            >
              <option value="Administrator">Administrator</option>
              <option value="Karyawan">Karyawan</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Status</label>
            <select 
              v-model="addForm.status"
              class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm"
            >
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>
          <div v-if="addError" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ addError }}
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button 
              type="button" 
              @click="showAddModal = false"
              class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button 
              type="submit" 
              :disabled="mutating"
              class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50"
            >
              {{ mutating ? 'Menyimpan...' : 'Simpan User' }}
            </button>
          </div>
        </form>
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
            <input v-model.number="supplierMaterialForm.price" type="number" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" placeholder="Contoh: 230000" />
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

    <!-- Add Packaging Modal -->
    <div v-if="showAddPackagingModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showAddPackagingModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-4">Tambah Kemasan Baru</h3>
        <form @submit.prevent="saveAddPackaging" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nama Kemasan</label>
            <input v-model="packagingForm.name" type="text" required class="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all sm:text-sm" placeholder="Nama Kemasan (cth: Sak, Karung, Jerigen)" />
          </div>
          <div v-if="packagingError" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ packagingError }}
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" @click="showAddPackagingModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
            <button type="submit" :disabled="mutating" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50">
              {{ mutating ? 'Menyimpan...' : 'Simpan Kemasan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Packaging Modal -->
    <div v-if="showEditPackagingModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showEditPackagingModal = false"></div>
      <div class="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-4">Edit Nama Kemasan</h3>
        <form @submit.prevent="saveEditPackaging" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nama Kemasan</label>
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
        <h3 class="text-lg font-bold text-white mb-2">Hapus Kemasan</h3>
        <p class="text-sm text-slate-400 mb-6">
          Apakah Anda yakin ingin menghapus kemasan <span class="text-white font-semibold">{{ deletingPackaging?.name }}</span>? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div class="flex items-center justify-end gap-3">
          <button type="button" @click="showDeletePackagingModal = false" class="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-all cursor-pointer">Batal</button>
          <button type="button" @click="executeDeletePackaging" :disabled="mutating" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-sm font-semibold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all cursor-pointer disabled:opacity-50">
            {{ mutating ? 'Menghapus...' : 'Hapus Kemasan' }}
          </button>
        </div>
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
