import { Uang } from '@/domain/shared/value-objects/uang';

export type TipeTransaksi = 'pemasukan' | 'pengeluaran';
export type SumberKategori = 'sistem' | 'pengguna';
export type AsalKategori = 'manual' | 'otomatis';

export interface AlokasiDefault {
  jumlah: Uang;
}

export interface KategoriProps {
  id: string;
  nama: string;
  tipeTransaksi: TipeTransaksi;
  sumber: SumberKategori;
  asal: AsalKategori;
  diarsipkan: boolean;
  alokasiDefault: AlokasiDefault | null;
  createdAt: Date;
}

export class Kategori {
  readonly id: string;
  readonly nama: string;
  readonly tipeTransaksi: TipeTransaksi;
  readonly sumber: SumberKategori;
  readonly asal: AsalKategori;
  readonly diarsipkan: boolean;
  readonly alokasiDefault: AlokasiDefault | null;
  readonly createdAt: Date;

  private constructor(props: KategoriProps) {
    this.id = props.id;
    this.nama = props.nama;
    this.tipeTransaksi = props.tipeTransaksi;
    this.sumber = props.sumber;
    this.asal = props.asal;
    this.diarsipkan = props.diarsipkan;
    this.alokasiDefault = props.alokasiDefault;
    this.createdAt = props.createdAt;
  }

  static buat(props: KategoriProps): Kategori {
    return new Kategori(props);
}

  bisaDipilihManual(): boolean {
    return this.asal !== 'otomatis' && !this.diarsipkan;
  }

  arsipkan(): Kategori {
    return new Kategori({ ...this.toProps(), diarsipkan: true });
  }

  private toProps(): KategoriProps {
    return {
      id: this.id,
      nama: this.nama,
      tipeTransaksi: this.tipeTransaksi,
      sumber: this.sumber,
      asal: this.asal,
      diarsipkan: this.diarsipkan,
      alokasiDefault: this.alokasiDefault,
      createdAt: this.createdAt,
    };
  }
}
