# Changelog - Harvest ERP

Dokumen ini mencatat riwayat perubahan dan pembaruan sistem secara kronologis.

---

## [1.0.0] - 2026-06-18

### Added
- **Modul Harga Pokok Produksi (HPP)**:
  - Implementasi tab khusus kalkulasi HPP dinamis untuk multi-item barang jadi (`barang_jadi` collection) di [Dashboard.vue](file:///d:/harvest-erp/src/pages/Dashboard.vue).
  - Penghitungan otomatis biaya bahan baku resep berbasis harga supplier termurah dari pemetaan `supplier_bahan` dibagi dengan `materialWeight` (berat kemasan) untuk menghasilkan harga presisi per unit (Kg/Liter).
  - Integrasi biaya tenaga kerja (Upah) dan Overhead pada level batch sebelum dibagi dengan jumlah hasil (pcs) menggunakan rumus:
    $$\text{HPP/Pcs} = \frac{\text{Bahan Baku} + \text{Upah} + \text{Overhead}}{\text{Hasil (Pcs)}}$$
  - Pembuatan Ringkasan Statistik HPP di bagian atas halaman (Total Produk Jadi, Rata-rata HPP per Pcs, dan Biaya Batch Tertinggi).

### Changed
- **Penyelarasan Kolom Tabel HPP**:
  - Mengubah susunan kolom agar kolom **Hasil** dipindahkan ke sebelah kanan kolom **Total Cost**:
    $$\text{Nama \& SKU} \rightarrow \text{Bahan Baku} \rightarrow \text{Upah} \rightarrow \text{Overhead} \rightarrow \textbf{Total Cost} \rightarrow \textbf{Hasil} \rightarrow \textbf{Total HPP} \rightarrow \text{Aksi}$$
  - Menghapus kolom Harga Jual dan Margin Keuntungan sesuai permintaan agar fokus murni pada kalkulasi biaya pokok (HPP).
- **Struktur Input Modal Tambah/Edit Barang Jadi**:
  - Mengatur ulang urutan form input parameter batch menjadi: `Upah (Rp)` $\rightarrow$ `Overhead (Rp)` $\rightarrow$ `Hasil (Pcs)`.
  - Menghapus imbuhan teks `"/ Batch"` pada label input agar visual lebih bersih.

### Fixed
- **Masalah Layout Overlapping**:
  - Menetapkan tinggi tetap (`h-8 flex items-end pb-1 leading-tight`) pada label input di dalam modal untuk mencegah teks bertumpuk ketika terjadi pembungkusan teks (wrap text) pada layar dengan resolusi kecil.
