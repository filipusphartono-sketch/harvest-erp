const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.vue', 'utf8');

// 1. Insert Horizontal Navbar
const navHtml = `
    <!-- Desktop Horizontal Menu (Wide Screens) -->
    <nav class="hidden md:flex bg-slate-900 border-b border-slate-800 shrink-0 relative z-40 px-6 h-12 items-center gap-6 shadow-sm select-none">
      <button 
        @click="currentTab = 'dashboard'"
        class="text-sm font-medium transition-colors cursor-pointer"
        :class="currentTab === 'dashboard' ? 'text-purple-400 font-semibold border-b-2 border-purple-500 py-3' : 'text-slate-400 hover:text-slate-200 py-3'"
      >
        Dashboard
      </button>
      <button 
        @click="currentTab = 'penjualan'"
        class="text-sm font-medium transition-colors cursor-pointer"
        :class="currentTab === 'penjualan' ? 'text-purple-400 font-semibold border-b-2 border-purple-500 py-3' : 'text-slate-400 hover:text-slate-200 py-3'"
      >
        Penjualan
      </button>
      <button 
        @click="currentTab = 'pembelian'"
        class="text-sm font-medium transition-colors cursor-pointer"
        :class="currentTab === 'pembelian' ? 'text-purple-400 font-semibold border-b-2 border-purple-500 py-3' : 'text-slate-400 hover:text-slate-200 py-3'"
      >
        Pembelian
      </button>

      <!-- Produksi Dropdown -->
      <div class="relative group h-full flex items-center">
        <button class="flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer" :class="currentTab.startsWith('produksi_') ? 'text-purple-400 font-semibold border-b-2 border-purple-500 py-3' : 'text-slate-400 hover:text-slate-200 py-3'">
          Produksi
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div class="absolute top-full left-0 hidden group-hover:block w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50">
          <button @click="currentTab = 'produksi_kelola_cetak'" class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer">Kelola Cetak</button>
          <button @click="currentTab = 'produksi_kelola_kemas'" class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer">Kelola Kemas</button>
          <button @click="currentTab = 'produksi_barang_jadi'" class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer">Barang Jadi</button>
          <button @click="currentTab = 'produksi_hpp'" class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer">Harga Pokok (HPP)</button>
        </div>
      </div>

      <!-- Gudang Dropdown -->
      <div class="relative group h-full flex items-center">
        <button class="flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer" :class="currentTab.startsWith('gudang_') ? 'text-purple-400 font-semibold border-b-2 border-purple-500 py-3' : 'text-slate-400 hover:text-slate-200 py-3'">
          Gudang
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div class="absolute top-full left-0 hidden group-hover:block w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50">
          <button @click="currentTab = 'gudang_barang_jadi'" class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer">Barang Jadi</button>
          <button @click="currentTab = 'gudang_bahan_baku'" class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer">Bahan Baku</button>
        </div>
      </div>

      <!-- Salary Dropdown -->
      <div class="relative group h-full flex items-center">
        <button class="flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer" :class="currentTab.startsWith('salary_') ? 'text-purple-400 font-semibold border-b-2 border-purple-500 py-3' : 'text-slate-400 hover:text-slate-200 py-3'">
          Salary / Gaji
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div class="absolute top-full left-0 hidden group-hover:block w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50">
          <button @click="currentTab = 'salary_cetak'" class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer">Gaji Cetak</button>
          <button @click="currentTab = 'salary_kemas'" class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer">Gaji Kemas</button>
        </div>
      </div>

      <!-- Pengaturan Dropdown -->
      <div class="relative group h-full flex items-center">
        <button class="flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer" :class="currentTab.startsWith('pengaturan_') || ['users','customer','suppliyer'].includes(currentTab) ? 'text-purple-400 font-semibold border-b-2 border-purple-500 py-3' : 'text-slate-400 hover:text-slate-200 py-3'">
          Pengaturan
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div class="absolute top-full left-0 hidden group-hover:block w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50">
          <button @click="currentTab = 'users'" class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer">Daftar Users</button>
          <button @click="currentTab = 'customer'" class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer">Daftar Customer</button>
          <button @click="currentTab = 'suppliyer'" class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer">Daftar Supplier</button>
          <button @click="currentTab = 'pengaturan_suppliyer_bahan'" class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer">Supplier - Bahan</button>
          <button @click="currentTab = 'pengaturan_bahan_baku'" class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer">Bahan Baku</button>
          <button @click="currentTab = 'pengaturan_daftar_kota'" class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer">Daftar Kota</button>
          <button @click="currentTab = 'pengaturan_daftar_kemas'" class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer">Tipe Kemasan</button>
        </div>
      </div>
    </nav>
`;

content = content.replace('<!-- Desktop Sidebar + Main Content Layout -->', navHtml + '\n    <!-- Mobile Sidebar & Main Content Layout -->');

// 2. Remove Desktop Sidebar
const asideStart = content.indexOf('<!-- Desktop Sidebar -->');
if (asideStart !== -1) {
  const asideEndStr = '</aside>';
  const asideEnd = content.indexOf(asideEndStr, asideStart);
  if (asideEnd !== -1) {
    content = content.substring(0, asideStart) + content.substring(asideEnd + asideEndStr.length);
  }
}

fs.writeFileSync('src/pages/Dashboard.vue', content);
console.log('Update complete');
