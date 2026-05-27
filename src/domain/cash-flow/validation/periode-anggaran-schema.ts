import { z } from 'zod';

export const buatPeriodeAnggaranSchema = z.object({
  bulan: z.number().int().min(1, 'Bulan tidak valid').max(12, 'Bulan tidak valid'),
  tahun: z.number().int().min(2020, 'Tahun minimal 2020').max(2099, 'Tahun terlalu jauh'),
  jenisData: z.enum(['realtime', 'historis']).default('realtime'),
});

export type BuatPeriodeAnggaranInput = z.infer<typeof buatPeriodeAnggaranSchema>;
