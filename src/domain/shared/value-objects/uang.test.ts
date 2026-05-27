import { describe, expect, it } from 'vitest';
import { Uang } from './uang';

describe('Uang', () => {
  describe('Uang.idr', () => {
    it('buat dari jumlah IDR', () => {
      const u = Uang.idr(50000);
      expect(u.jumlah).toBe(50000);
      expect(u.matauang).toBe('IDR');
    });

    it('tolak NaN', () => {
      expect(() => Uang.idr(NaN)).toThrow();
    });

    it('tolak Infinity', () => {
      expect(() => Uang.idr(Infinity)).toThrow();
    });
  });

  describe('Uang.dari', () => {
    it('buat dari UangData', () => {
      const u = Uang.dari({ jumlah: 100000, matauang: 'IDR' });
      expect(u.jumlah).toBe(100000);
    });
  });

  describe('tambah', () => {
    it('jumlahkan dua Uang IDR', () => {
      const hasil = Uang.idr(100000).tambah(Uang.idr(50000));
      expect(hasil.jumlah).toBe(150000);
      expect(hasil.matauang).toBe('IDR');
    });

    it('tidak mutasi nilai asal', () => {
      const a = Uang.idr(100000);
      a.tambah(Uang.idr(50000));
      expect(a.jumlah).toBe(100000);
    });
  });

  describe('kurang', () => {
    it('kurangi dua Uang IDR', () => {
      const hasil = Uang.idr(100000).kurang(Uang.idr(30000));
      expect(hasil.jumlah).toBe(70000);
    });

    it('hasil bisa negatif (margin)', () => {
      const hasil = Uang.idr(10000).kurang(Uang.idr(50000));
      expect(hasil.jumlah).toBe(-40000);
    });
  });

  describe('format', () => {
    it('format IDR tanpa desimal', () => {
      const hasil = Uang.idr(1500000).format();
      expect(hasil).toContain('1.500.000');
    });
  });

  describe('toData', () => {
    it('serialisasi ke UangData', () => {
      const data = Uang.idr(75000).toData();
      expect(data).toEqual({ jumlah: 75000, matauang: 'IDR' });
    });
  });
});
