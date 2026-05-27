import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/infrastructure/db/schema';
import { KategoriRepository } from './kategori-repository';
import { Kategori } from '@/domain/cash-flow/entities/kategori';
import { Uang } from '@/domain/shared/value-objects/uang';

function makeKategori(overrides: Partial<Parameters<typeof Kategori.buat>[0]> = {}): Kategori {
  return Kategori.buat({
    id: crypto.randomUUID(),
    nama: 'Test',
    tipeTransaksi: 'pengeluaran',
    sumber: 'pengguna',
    asal: 'manual',
    diarsipkan: false,
    alokasiDefault: null,
    createdAt: new Date(),
    ...overrides,
  });
}

describe('KategoriRepository', () => {
  let repo: KategoriRepository;

  beforeEach(async () => {
    await db.kategori.clear();
    await db.transaksi.clear();
    repo = new KategoriRepository();
  });

  describe('upsertSystemSeeds', () => {
    it('inserts system seeds on first call', async () => {
      await repo.upsertSystemSeeds();
      const all = await repo.findAll();
      const ids = all.map((k) => k.id);
      expect(ids).toContain('sistem:cicilan-utang');
      expect(ids).toContain('sistem:kontribusi-buffer');
    });

    it('idempotent — second call does not duplicate', async () => {
      await repo.upsertSystemSeeds();
      await repo.upsertSystemSeeds();
      const all = await repo.findAll();
      const sistemIds = all.filter((k) => k.sumber === 'sistem').map((k) => k.id);
      expect(sistemIds).toHaveLength(2);
    });
  });

  describe('save & findById', () => {
    it('round-trips a kategori', async () => {
      const k = makeKategori({ nama: 'Makan', tipeTransaksi: 'pengeluaran' });
      await repo.save(k);
      const found = await repo.findById(k.id);
      expect(found).not.toBeNull();
      expect(found?.nama).toBe('Makan');
      expect(found?.tipeTransaksi).toBe('pengeluaran');
    });

    it('round-trips alokasiDefault', async () => {
      const k = makeKategori({
        alokasiDefault: { jumlah: Uang.idr(500_000) },
      });
      await repo.save(k);
      const found = await repo.findById(k.id);
      expect(found?.alokasiDefault?.jumlah.jumlah).toBe(500_000);
      expect(found?.alokasiDefault?.jumlah.matauang).toBe('IDR');
    });

    it('returns null for missing id', async () => {
      const found = await repo.findById('nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns all saved categories', async () => {
      await repo.save(makeKategori({ nama: 'A' }));
      await repo.save(makeKategori({ nama: 'B' }));
      const all = await repo.findAll();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('findByTipe', () => {
    it('filters by tipeTransaksi', async () => {
      await repo.save(makeKategori({ tipeTransaksi: 'pemasukan', nama: 'Gaji' }));
      await repo.save(makeKategori({ tipeTransaksi: 'pengeluaran', nama: 'Makan' }));
      const pemasukan = await repo.findByTipe('pemasukan');
      expect(pemasukan.every((k) => k.tipeTransaksi === 'pemasukan')).toBe(true);
      expect(pemasukan.some((k) => k.nama === 'Gaji')).toBe(true);
    });
  });

  describe('archive', () => {
    it('marks kategori as diarsipkan', async () => {
      const k = makeKategori();
      await repo.save(k);
      await repo.archive(k.id);
      const found = await repo.findById(k.id);
      expect(found?.diarsipkan).toBe(true);
    });

    it('throws for nonexistent id', async () => {
      await expect(repo.archive('nonexistent')).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('deletes kategori with no transactions', async () => {
      const k = makeKategori();
      await repo.save(k);
      await repo.delete(k.id);
      const found = await repo.findById(k.id);
      expect(found).toBeNull();
    });

    it('blocks delete when kategori has transactions', async () => {
      const k = makeKategori();
      await repo.save(k);
      await db.transaksi.add({
        id: crypto.randomUUID(),
        periodeAnggaranId: 'p1',
        tipe: 'pengeluaran',
        tanggal: new Date().toISOString(),
        kategoriId: k.id,
        jumlah: 10_000,
        matauang: 'IDR',
        catatan: null,
        asal: 'manual',
        createdAt: new Date().toISOString(),
      });
      await expect(repo.delete(k.id)).rejects.toThrow('tidak bisa dihapus');
    });
  });

  describe('system seed invariants', () => {
    it('system categories have asal=otomatis', async () => {
      await repo.upsertSystemSeeds();
      const sistem = (await repo.findAll()).filter((k) => k.sumber === 'sistem');
      expect(sistem.every((k) => k.asal === 'otomatis')).toBe(true);
    });

    it('system categories bisaDipilihManual returns false', async () => {
      await repo.upsertSystemSeeds();
      const sistem = (await repo.findAll()).filter((k) => k.sumber === 'sistem');
      expect(sistem.every((k) => !k.bisaDipilihManual())).toBe(true);
    });
  });
});
