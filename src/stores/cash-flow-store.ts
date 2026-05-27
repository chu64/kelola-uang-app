'use client';

import { create } from 'zustand';
import { Kategori } from '@/domain/cash-flow/entities/kategori';
import { PeriodeAnggaran } from '@/domain/cash-flow/entities/periode-anggaran';
import { AlokasiKategori } from '@/domain/cash-flow/entities/alokasi-kategori';
import { kategoriRepository } from '@/infrastructure/repositories/kategori-repository';
import { periodeAnggaranRepository } from '@/infrastructure/repositories/periode-anggaran-repository';
import type { BuatKategoriInput } from '@/domain/cash-flow/validation/kategori-schema';
import type { BuatPeriodeAnggaranInput } from '@/domain/cash-flow/validation/periode-anggaran-schema';
import { Uang } from '@/domain/shared/value-objects/uang';

function generateId(): string {
  return crypto.randomUUID();
}

interface CashFlowState {
  // ── Kategori ──────────────────────────────────────────────────────────────
  kategoriList: Kategori[];
  isLoading: boolean;
  error: string | null;

  loadKategori: () => Promise<void>;
  buatKategori: (input: BuatKategoriInput) => Promise<void>;
  arsipkanKategori: (id: string) => Promise<void>;
  hapusKategori: (id: string) => Promise<void>;

  // ── PeriodeAnggaran ───────────────────────────────────────────────────────
  periodeList: PeriodeAnggaran[];
  isPeriodeLoading: boolean;
  periodeError: string | null;

  loadPeriode: () => Promise<void>;
  buatPeriode: (input: BuatPeriodeAnggaranInput) => Promise<PeriodeAnggaran>;
}

export const useCashFlowStore = create<CashFlowState>((set, get) => ({
  // ── Kategori ──────────────────────────────────────────────────────────────
  kategoriList: [],
  isLoading: false,
  error: null,

  loadKategori: async () => {
    set({ isLoading: true, error: null });
    try {
      await kategoriRepository.upsertSystemSeeds();
      const list = await kategoriRepository.findAll();
      set({ kategoriList: list, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  buatKategori: async (input) => {
    const kategori = Kategori.buat({
      id: generateId(),
      nama: input.nama,
      tipeTransaksi: input.tipeTransaksi,
      sumber: 'pengguna',
      asal: 'manual',
      diarsipkan: false,
      alokasiDefault:
        input.alokasiDefaultJumlah != null && input.alokasiDefaultJumlah > 0
          ? { jumlah: Uang.idr(input.alokasiDefaultJumlah) }
          : null,
      createdAt: new Date(),
    });
    await kategoriRepository.save(kategori);
    await get().loadKategori();
  },

  arsipkanKategori: async (id) => {
    await kategoriRepository.archive(id);
    await get().loadKategori();
  },

  hapusKategori: async (id) => {
    await kategoriRepository.delete(id);
    await get().loadKategori();
  },

  // ── PeriodeAnggaran ───────────────────────────────────────────────────────
  periodeList: [],
  isPeriodeLoading: false,
  periodeError: null,

  loadPeriode: async () => {
    set({ isPeriodeLoading: true, periodeError: null });
    try {
      const list = await periodeAnggaranRepository.findAll();
      set({ periodeList: list, isPeriodeLoading: false });
    } catch (e) {
      set({ periodeError: (e as Error).message, isPeriodeLoading: false });
    }
  },

  buatPeriode: async (input) => {
    const now = new Date();
    const periode = PeriodeAnggaran.buat({
      id: generateId(),
      bulan: input.bulan,
      tahun: input.tahun,
      status: 'aktif',
      jenisData: input.jenisData ?? 'realtime',
      createdAt: now,
      updatedAt: now,
    });

    // Throws DuplicatePeriodeError if compound unique constraint violated
    await periodeAnggaranRepository.save(periode);

    // Copy AlokasiDefault from all kategori into AlokasiKategori for this period
    await kategoriRepository.upsertSystemSeeds();
    const allKategori = await kategoriRepository.findAll();
    const withDefault = allKategori.filter(
      (k) => k.alokasiDefault !== null && !k.diarsipkan,
    );

    for (const k of withDefault) {
      const alokasi = AlokasiKategori.buat({
        id: generateId(),
        periodeAnggaranId: periode.id,
        kategoriId: k.id,
        jumlah: k.alokasiDefault!.jumlah,
        createdAt: now,
        updatedAt: now,
      });
      await periodeAnggaranRepository.saveAlokasiKategori(alokasi);
    }

    await get().loadPeriode();
    return periode;
  },
}));
