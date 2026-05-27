'use client';

import { create } from 'zustand';
import { Kategori } from '@/domain/cash-flow/entities/kategori';
import { kategoriRepository } from '@/infrastructure/repositories/kategori-repository';
import type { BuatKategoriInput } from '@/domain/cash-flow/validation/kategori-schema';
import { Uang } from '@/domain/shared/value-objects/uang';

function generateId(): string {
  return crypto.randomUUID();
}

interface CashFlowState {
  kategoriList: Kategori[];
  isLoading: boolean;
  error: string | null;

  loadKategori: () => Promise<void>;
  buatKategori: (input: BuatKategoriInput) => Promise<void>;
  arsipkanKategori: (id: string) => Promise<void>;
  hapusKategori: (id: string) => Promise<void>;
}

export const useCashFlowStore = create<CashFlowState>((set, get) => ({
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
}));
