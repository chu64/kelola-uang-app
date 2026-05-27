import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/infrastructure/db/schema';
import { PeriodeAnggaranRepository, DuplicatePeriodeError } from './periode-anggaran-repository';
import { PeriodeAnggaran } from '@/domain/cash-flow/entities/periode-anggaran';
import { AlokasiKategori } from '@/domain/cash-flow/entities/alokasi-kategori';
import { Uang } from '@/domain/shared/value-objects/uang';

function makePeriode(
  overrides: Partial<Parameters<typeof PeriodeAnggaran.buat>[0]> = {},
): PeriodeAnggaran {
  return PeriodeAnggaran.buat({
    id: crypto.randomUUID(),
    bulan: 5,
    tahun: 2025,
    status: 'aktif',
    jenisData: 'realtime',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

describe('PeriodeAnggaranRepository', () => {
  let repo: PeriodeAnggaranRepository;

  beforeEach(async () => {
    await db.periodeAnggaran.clear();
    await db.alokasiKategori.clear();
    repo = new PeriodeAnggaranRepository();
  });

  describe('save & findById', () => {
    it('round-trips a periode', async () => {
      const p = makePeriode({ bulan: 3, tahun: 2025 });
      await repo.save(p);
      const found = await repo.findById(p.id);
      expect(found).not.toBeNull();
      expect(found?.bulan).toBe(3);
      expect(found?.tahun).toBe(2025);
      expect(found?.status).toBe('aktif');
      expect(found?.jenisData).toBe('realtime');
    });

    it('returns null for missing id', async () => {
      expect(await repo.findById('nonexistent')).toBeNull();
    });
  });

  describe('duplicate bulan+tahun', () => {
    it('throws DuplicatePeriodeError on same bulan+tahun', async () => {
      await repo.save(makePeriode({ bulan: 5, tahun: 2025 }));
      await expect(
        repo.save(makePeriode({ bulan: 5, tahun: 2025 })),
      ).rejects.toThrow(DuplicatePeriodeError);
    });

    it('allows different bulan same tahun', async () => {
      await repo.save(makePeriode({ bulan: 5, tahun: 2025 }));
      await expect(
        repo.save(makePeriode({ bulan: 6, tahun: 2025 })),
      ).resolves.not.toThrow();
    });

    it('allows same bulan different tahun', async () => {
      await repo.save(makePeriode({ bulan: 5, tahun: 2025 }));
      await expect(
        repo.save(makePeriode({ bulan: 5, tahun: 2026 })),
      ).resolves.not.toThrow();
    });
  });

  describe('findAll', () => {
    it('returns sorted most-recent-first', async () => {
      await repo.save(makePeriode({ bulan: 1, tahun: 2025 }));
      await repo.save(makePeriode({ bulan: 3, tahun: 2025 }));
      await repo.save(makePeriode({ bulan: 12, tahun: 2024 }));
      const list = await repo.findAll();
      expect(list[0].bulan).toBe(3);
      expect(list[0].tahun).toBe(2025);
      expect(list[2].bulan).toBe(12);
      expect(list[2].tahun).toBe(2024);
    });
  });

  describe('findByBulanTahun', () => {
    it('finds by compound key', async () => {
      const p = makePeriode({ bulan: 7, tahun: 2025 });
      await repo.save(p);
      const found = await repo.findByBulanTahun(7, 2025);
      expect(found?.id).toBe(p.id);
    });

    it('returns null when not found', async () => {
      expect(await repo.findByBulanTahun(1, 2000)).toBeNull();
    });
  });

  describe('update', () => {
    it('updates status in-place', async () => {
      const p = makePeriode({ bulan: 9, tahun: 2025 });
      await repo.save(p);
      const tutup = p.tutup();
      await repo.update(tutup);
      const found = await repo.findById(p.id);
      expect(found?.status).toBe('ditutup');
    });
  });

  describe('AlokasiKategori', () => {
    it('saves and retrieves alokasi by periode', async () => {
      const p = makePeriode();
      await repo.save(p);
      const alokasi = AlokasiKategori.buat({
        id: crypto.randomUUID(),
        periodeAnggaranId: p.id,
        kategoriId: 'kategori-123',
        jumlah: Uang.idr(500_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await repo.saveAlokasiKategori(alokasi);
      const list = await repo.findAlokasiByPeriode(p.id);
      expect(list).toHaveLength(1);
      expect(list[0].kategoriId).toBe('kategori-123');
      expect(list[0].jumlah.jumlah).toBe(500_000);
    });

    it('returns empty array when no alokasi', async () => {
      const list = await repo.findAlokasiByPeriode('nonexistent');
      expect(list).toHaveLength(0);
    });
  });
});
