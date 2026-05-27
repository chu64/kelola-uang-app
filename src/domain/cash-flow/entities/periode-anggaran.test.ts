import { describe, expect, it } from 'vitest';
import { PeriodeAnggaran } from './periode-anggaran';

function makePeriode(overrides: Partial<Parameters<typeof PeriodeAnggaran.buat>[0]> = {}): PeriodeAnggaran {
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

describe('PeriodeAnggaran', () => {
  describe('buat', () => {
    it('creates with valid props', () => {
      const p = makePeriode();
      expect(p.bulan).toBe(5);
      expect(p.tahun).toBe(2025);
      expect(p.status).toBe('aktif');
    });

    it('throws for bulan < 1', () => {
      expect(() => makePeriode({ bulan: 0 })).toThrow('bulan');
    });

    it('throws for bulan > 12', () => {
      expect(() => makePeriode({ bulan: 13 })).toThrow('bulan');
    });
  });

  describe('bisaMenerimaTransaksi', () => {
    it('returns true for aktif', () => {
      expect(makePeriode({ status: 'aktif' }).bisaMenerimaTransaksi()).toBe(true);
    });

    it('returns false for ditutup', () => {
      expect(makePeriode({ status: 'ditutup' }).bisaMenerimaTransaksi()).toBe(false);
    });

    it('returns false for diarsip', () => {
      expect(makePeriode({ status: 'diarsip' }).bisaMenerimaTransaksi()).toBe(false);
    });
  });

  describe('status transitions', () => {
    it('aktif → tutup succeeds', () => {
      const p = makePeriode({ status: 'aktif' }).tutup();
      expect(p.status).toBe('ditutup');
    });

    it('ditutup → arsipkan succeeds', () => {
      const p = makePeriode({ status: 'ditutup' }).arsipkan();
      expect(p.status).toBe('diarsip');
    });

    it('aktif → arsipkan throws (skip step)', () => {
      expect(() => makePeriode({ status: 'aktif' }).arsipkan()).toThrow();
    });

    it('ditutup → tutup throws (backward)', () => {
      expect(() => makePeriode({ status: 'ditutup' }).tutup()).toThrow();
    });

    it('diarsip → tutup throws (no reverse)', () => {
      expect(() => makePeriode({ status: 'diarsip' }).tutup()).toThrow();
    });

    it('transition updates updatedAt', () => {
      const before = new Date(Date.now() - 1);
      const p = makePeriode({ status: 'aktif' }).tutup();
      expect(p.updatedAt.getTime()).toBeGreaterThan(before.getTime());
    });

    it('transition is immutable — original unchanged', () => {
      const original = makePeriode({ status: 'aktif' });
      original.tutup();
      expect(original.status).toBe('aktif');
    });
  });
});
