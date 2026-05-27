import { z } from 'zod';

export const buatKategoriSchema = z.object({
  nama: z.string().min(1, 'Nama kategori wajib diisi').max(100, 'Nama terlalu panjang'),
  tipeTransaksi: z.enum(['pemasukan', 'pengeluaran']),
  alokasiDefaultJumlah: z.number().nonnegative('Jumlah harus positif').nullable().optional(),
});

export type BuatKategoriInput = z.infer<typeof buatKategoriSchema>;
