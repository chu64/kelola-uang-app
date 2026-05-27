import { db } from '@/infrastructure/db/schema';
import type { KategoriRow } from '@/infrastructure/db/schema';
import { Kategori, type TipeTransaksi } from '@/domain/cash-flow/entities/kategori';
import { Uang } from '@/domain/shared/value-objects/uang';
import { KATEGORI_SISTEM } from '@/domain/cash-flow/seeds/kategori-sistem';

function rowToDomain(row: KategoriRow): Kategori {
  return Kategori.buat({
    id: row.id,
    nama: row.nama,
    tipeTransaksi: row.tipeTransaksi,
    sumber: row.sumber,
    asal: row.asal,
    diarsipkan: row.diarsipkan,
    alokasiDefault:
      row.alokasiDefaultJumlah !== null && row.alokasiDefaultMatauang !== null
        ? { jumlah: Uang.dari({ jumlah: row.alokasiDefaultJumlah, matauang: row.alokasiDefaultMatauang }) }
        : null,
    createdAt: new Date(row.createdAt),
  });
}

function domainToRow(k: Kategori): KategoriRow {
  return {
    id: k.id,
    nama: k.nama,
    tipeTransaksi: k.tipeTransaksi,
    sumber: k.sumber,
    asal: k.asal,
    diarsipkan: k.diarsipkan,
    alokasiDefaultJumlah: k.alokasiDefault?.jumlah.jumlah ?? null,
    alokasiDefaultMatauang: k.alokasiDefault?.jumlah.matauang ?? null,
    createdAt: k.createdAt.toISOString(),
  };
}

export class KategoriRepository {
  async upsertSystemSeeds(): Promise<void> {
    await db.kategori.bulkPut(KATEGORI_SISTEM.map(domainToRow));
  }

  async findAll(): Promise<Kategori[]> {
    const rows = await db.kategori.toArray();
    return rows.map(rowToDomain);
  }

  async findByTipe(tipe: TipeTransaksi): Promise<Kategori[]> {
    const rows = await db.kategori.where('tipeTransaksi').equals(tipe).toArray();
    return rows.map(rowToDomain);
  }

  async findById(id: string): Promise<Kategori | null> {
    const row = await db.kategori.get(id);
    return row ? rowToDomain(row) : null;
  }

  async save(kategori: Kategori): Promise<void> {
    await db.kategori.put(domainToRow(kategori));
  }

  async archive(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Kategori '${id}' tidak ditemukan`);
    await this.save(existing.arsipkan());
  }

  async delete(id: string): Promise<void> {
    const txCount = await db.transaksi.where('kategoriId').equals(id).count();
    if (txCount > 0) {
      throw new Error('Kategori tidak bisa dihapus karena sudah memiliki transaksi');
    }
    await db.kategori.delete(id);
  }
}

export const kategoriRepository = new KategoriRepository();
