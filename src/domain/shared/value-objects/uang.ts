export type MatauangKode = 'IDR';

export interface UangData {
  jumlah: number;
  matauang: MatauangKode;
}

export class Uang {
  readonly jumlah: number;
  readonly matauang: MatauangKode;

  private constructor(jumlah: number, matauang: MatauangKode) {
    if (!Number.isFinite(jumlah)) {
      throw new Error('Uang: jumlah harus bilangan finite');
    }
    this.jumlah = jumlah;
    this.matauang = matauang;
  }

  static dari(data: UangData): Uang {
    return new Uang(data.jumlah, data.matauang);
  }

  static idr(jumlah: number): Uang {
    return new Uang(jumlah, 'IDR');
  }

  tambah(lain: Uang): Uang {
    this.validasiMatauang(lain);
    return new Uang(this.jumlah + lain.jumlah, this.matauang);
  }

  kurang(lain: Uang): Uang {
    this.validasiMatauang(lain);
    return new Uang(this.jumlah - lain.jumlah, this.matauang);
  }

  format(): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: this.matauang,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(this.jumlah);
  }

  toData(): UangData {
    return { jumlah: this.jumlah, matauang: this.matauang };
  }

  private validasiMatauang(lain: Uang): void {
    if (this.matauang !== lain.matauang) {
      throw new Error(
        `Uang: tidak bisa operasi antara ${this.matauang} dan ${lain.matauang}`,
      );
    }
  }
}
