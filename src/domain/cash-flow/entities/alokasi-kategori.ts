import { Uang } from '@/domain/shared/value-objects/uang';

export interface AlokasiKategoriProps {
  id: string;
  periodeAnggaranId: string;
  kategoriId: string;
  jumlah: Uang;
  createdAt: Date;
  updatedAt: Date;
}

export class AlokasiKategori {
  readonly id: string;
  readonly periodeAnggaranId: string;
  readonly kategoriId: string;
  readonly jumlah: Uang;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: AlokasiKategoriProps) {
    this.id = props.id;
    this.periodeAnggaranId = props.periodeAnggaranId;
    this.kategoriId = props.kategoriId;
    this.jumlah = props.jumlah;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static buat(props: AlokasiKategoriProps): AlokasiKategori {
    return new AlokasiKategori(props);
  }
}
