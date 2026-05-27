import Dexie, { type EntityTable } from 'dexie';

// ── periodeAnggaran ──────────────────────────────────────────────────────────
export interface PeriodeAnggaranRow {
  id: string;
  bulan: number;  // 1–12
  tahun: number;
  status: 'aktif' | 'ditutup' | 'diarsip';
  jenisData: 'realtime' | 'historis';
  createdAt: string;
  updatedAt: string;
}

// ── transaksi ────────────────────────────────────────────────────────────────
export interface TransaksiRow {
  id: string;
  periodeAnggaranId: string;
  tipe: 'pemasukan' | 'pengeluaran';
  tanggal: string;
  kategoriId: string;
  jumlah: number;
  matauang: 'IDR';
  catatan: string | null;
  asal: 'manual' | 'otomatis';
  createdAt: string;
}

// ── kategori ─────────────────────────────────────────────────────────────────
export interface KategoriRow {
  id: string;
  nama: string;
  tipeTransaksi: 'pemasukan' | 'pengeluaran';
  sumber: 'sistem' | 'pengguna';
  asal: 'manual' | 'otomatis';
  diarsipkan: boolean;
  // AlokasiDefault flattened
  alokasiDefaultJumlah: number | null;
  alokasiDefaultMatauang: 'IDR' | null;
  createdAt: string;
}

// ── alokasiKategori ──────────────────────────────────────────────────────────
export interface AlokasiKategoriRow {
  id: string;
  periodeAnggaranId: string;
  kategoriId: string;
  jumlah: number;
  matauang: 'IDR';
  createdAt: string;
  updatedAt: string;
}

// ── utang ────────────────────────────────────────────────────────────────────
export interface UtangRow {
  id: string;
  nama: string;
  jenisUtang: 'pinjolOnline' | 'pinjamanTeman' | 'cicilanBarang';
  status: 'aktif' | 'lunas' | 'bermasalah';
  tanggalMulai: string;
  // StrukturUtang flattened
  pokokAwal: number;
  matauang: 'IDR';
  metodeBunga: 'flat' | 'efektif' | 'tanpaBunga';
  bungaPersen: number | null;
  jenisCicilan: 'tetap' | 'fleksibel';
  tenorBulan: number | null;
  cicilanMinimumJumlah: number | null;
  dendaAktif: boolean;
  dendaJenisHitungan: 'persentase' | 'nominal' | null;
  dendaNilai: number | null;
  // cicilanBarang extra
  namaBarang: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── pembayaran ───────────────────────────────────────────────────────────────
export interface PembayaranRow {
  id: string;
  utangId: string;
  tanggal: string;
  jumlah: number;
  matauang: 'IDR';
  jenisPembayaran: 'cicilan' | 'ekstra' | 'pelunasan';
  statusKetepatan: 'tepat' | 'terlambat' | 'lebihAwal';
  catatan: string | null;
  createdAt: string;
}

// ── buffer ───────────────────────────────────────────────────────────────────
export interface BufferRow {
  id: string;
  nama: string;
  perilaku: 'akumulasiSekali' | 'siklusRutin';
  status: 'aktif' | 'tercapai' | 'diarsip';
  jenisTarget: 'tetap' | 'estimasi';
  targetJumlah: number;
  targetMatauang: 'IDR';
  // KontribusiRutin flattened (optional)
  rutinJumlah: number | null;
  rutinMatauang: 'IDR' | null;
  rutinFrekuensi: 'bulanan' | 'mingguan' | 'setiapGajian' | null;
  createdAt: string;
  updatedAt: string;
}

// ── kontribusi ───────────────────────────────────────────────────────────────
export interface KontribusiRow {
  id: string;
  bufferId: string;
  tanggal: string;
  jumlah: number;
  matauang: 'IDR';
  jenisKontribusi: 'rutin' | 'ekstra';
  transaksiId: string | null;  // traceability — links to auto-Pengeluaran
  createdAt: string;
}

// ── pencairan ────────────────────────────────────────────────────────────────
export interface PencairanRow {
  id: string;
  bufferId: string;
  tanggal: string;
  jumlah: number;
  matauang: 'IDR';
  catatan: string | null;
  createdAt: string;
}

// ── profilKeuangan ───────────────────────────────────────────────────────────
export interface ProfilKeuanganRow {
  id: 'singleton';
  penghasilanTetapBulanan: number;
  matauang: 'IDR';
  tanggungan: number;
  toleransiRisiko: 'rendah' | 'sedang' | 'tinggi';
  updatedAt: string;
}

// ── sesiKeputusan ─────────────────────────────────────────────────────────────
export interface SesiKeputusanRow {
  id: string;
  tanggalDibuat: string;
  topikKeputusan: 'alokasiSurplus' | 'utangBaru' | 'prioritasPelunasan' | 'kondisiDarurat';
  modeMasuk: 'rekomendasi' | 'pemanduan';
  selesai: boolean;
  snapshotJson: string;   // JSON — SnapshotKondisiFinansial
  outputJson: string | null;   // JSON — Rekomendasi[]
  keputusanFinalJson: string | null;  // JSON — KeputusanFinal
}

// ── Dexie database ────────────────────────────────────────────────────────────
export class KelolaUangDatabase extends Dexie {
  periodeAnggaran!: EntityTable<PeriodeAnggaranRow, 'id'>;
  transaksi!: EntityTable<TransaksiRow, 'id'>;
  kategori!: EntityTable<KategoriRow, 'id'>;
  alokasiKategori!: EntityTable<AlokasiKategoriRow, 'id'>;
  utang!: EntityTable<UtangRow, 'id'>;
  pembayaran!: EntityTable<PembayaranRow, 'id'>;
  buffer!: EntityTable<BufferRow, 'id'>;
  kontribusi!: EntityTable<KontribusiRow, 'id'>;
  pencairan!: EntityTable<PencairanRow, 'id'>;
  profilKeuangan!: EntityTable<ProfilKeuanganRow, 'id'>;
  sesiKeputusan!: EntityTable<SesiKeputusanRow, 'id'>;

  constructor() {
    super('kelola-uang');

    this.version(1).stores({
      periodeAnggaran: 'id, &[bulan+tahun], status',
      transaksi: 'id, periodeAnggaranId, tipe, tanggal, kategoriId',
      kategori: 'id, tipeTransaksi, sumber, asal',
      alokasiKategori: 'id, periodeAnggaranId, kategoriId, &[periodeAnggaranId+kategoriId]',
      utang: 'id, jenisUtang, status, tanggalMulai',
      pembayaran: 'id, utangId, tanggal, jenisPembayaran',
      buffer: 'id, perilaku, status',
      kontribusi: 'id, bufferId, tanggal',
      pencairan: 'id, bufferId, tanggal',
      profilKeuangan: 'id',
      sesiKeputusan: 'id, tanggalDibuat, topikKeputusan, selesai',
    });
  }
}

export const db = new KelolaUangDatabase();
