import { Kategori } from '@/domain/cash-flow/entities/kategori';

export const KATEGORI_SISTEM: Kategori[] = [
  Kategori.buat({
    id: 'sistem:cicilan-utang',
    nama: 'Cicilan Utang',
    tipeTransaksi: 'pengeluaran',
    sumber: 'sistem',
    asal: 'otomatis',
    diarsipkan: false,
    alokasiDefault: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  }),
  Kategori.buat({
    id: 'sistem:kontribusi-buffer',
    nama: 'Kontribusi Buffer',
    tipeTransaksi: 'pengeluaran',
    sumber: 'sistem',
    asal: 'otomatis',
    diarsipkan: false,
    alokasiDefault: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  }),
];
