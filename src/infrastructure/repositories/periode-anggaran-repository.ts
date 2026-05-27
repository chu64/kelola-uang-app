import Dexie from 'dexie';
import { db } from '@/infrastructure/db/schema';
import type { PeriodeAnggaranRow, AlokasiKategoriRow } from '@/infrastructure/db/schema';
import { PeriodeAnggaran } from '@/domain/cash-flow/entities/periode-anggaran';
import { AlokasiKategori } from '@/domain/cash-flow/entities/alokasi-kategori';
import { Uang } from '@/domain/shared/value-objects/uang';

function rowToDomain(row: PeriodeAnggaranRow): PeriodeAnggaran {
  return PeriodeAnggaran.buat({
    id: row.id,
    bulan: row.bulan,
    tahun: row.tahun,
    status: row.status,
    jenisData: row.jenisData,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  });
}

function domainToRow(p: PeriodeAnggaran): PeriodeAnggaranRow {
  return {
    id: p.id,
    bulan: p.bulan,
    tahun: p.tahun,
    status: p.status,
    jenisData: p.jenisData,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function alokasiRowToDomain(row: AlokasiKategoriRow): AlokasiKategori {
  return AlokasiKategori.buat({
    id: row.id,
    periodeAnggaranId: row.periodeAnggaranId,
    kategoriId: row.kategoriId,
    jumlah: Uang.dari({ jumlah: row.jumlah, matauang: row.matauang }),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  });
}

function alokasiDomainToRow(a: AlokasiKategori): AlokasiKategoriRow {
  return {
    id: a.id,
    periodeAnggaranId: a.periodeAnggaranId,
    kategoriId: a.kategoriId,
    jumlah: a.jumlah.jumlah,
    matauang: a.jumlah.matauang,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export class DuplicatePeriodeError extends Error {
  constructor(bulan: number, tahun: number) {
    super(`Periode anggaran untuk ${bulan}/${tahun} sudah ada`);
    this.name = 'DuplicatePeriodeError';
  }
}

export class PeriodeAnggaranRepository {
  async findAll(): Promise<PeriodeAnggaran[]> {
    const rows = await db.periodeAnggaran.toArray();
    return rows
      .map(rowToDomain)
      .sort((a, b) => b.tahun - a.tahun || b.bulan - a.bulan);
  }

  async findById(id: string): Promise<PeriodeAnggaran | null> {
    const row = await db.periodeAnggaran.get(id);
    return row ? rowToDomain(row) : null;
  }

  async findByBulanTahun(bulan: number, tahun: number): Promise<PeriodeAnggaran | null> {
    const row = await db.periodeAnggaran.where('[bulan+tahun]').equals([bulan, tahun]).first();
    return row ? rowToDomain(row) : null;
  }

  async save(periode: PeriodeAnggaran): Promise<void> {
    try {
      await db.periodeAnggaran.add(domainToRow(periode));
    } catch (e) {
      if (e instanceof Dexie.ConstraintError) {
        throw new DuplicatePeriodeError(periode.bulan, periode.tahun);
      }
      throw e;
    }
  }

  async update(periode: PeriodeAnggaran): Promise<void> {
    await db.periodeAnggaran.put(domainToRow(periode));
  }

  async saveAlokasiKategori(alokasi: AlokasiKategori): Promise<void> {
    await db.alokasiKategori.put(alokasiDomainToRow(alokasi));
  }

  async findAlokasiByPeriode(periodeAnggaranId: string): Promise<AlokasiKategori[]> {
    const rows = await db.alokasiKategori
      .where('periodeAnggaranId')
      .equals(periodeAnggaranId)
      .toArray();
    return rows.map(alokasiRowToDomain);
  }
}

export const periodeAnggaranRepository = new PeriodeAnggaranRepository();
