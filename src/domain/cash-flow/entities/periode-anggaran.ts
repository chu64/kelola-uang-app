export type StatusPeriode = 'aktif' | 'ditutup' | 'diarsip';
export type JenisData = 'realtime' | 'historis';

export interface PeriodeAnggaranProps {
  id: string;
  bulan: number;
  tahun: number;
  status: StatusPeriode;
  jenisData: JenisData;
  createdAt: Date;
  updatedAt: Date;
}

const NEXT_STATUS: Partial<Record<StatusPeriode, StatusPeriode>> = {
  aktif: 'ditutup',
  ditutup: 'diarsip',
};

export class PeriodeAnggaran {
  readonly id: string;
  readonly bulan: number;
  readonly tahun: number;
  readonly status: StatusPeriode;
  readonly jenisData: JenisData;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: PeriodeAnggaranProps) {
    this.id = props.id;
    this.bulan = props.bulan;
    this.tahun = props.tahun;
    this.status = props.status;
    this.jenisData = props.jenisData;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static buat(props: PeriodeAnggaranProps): PeriodeAnggaran {
    if (props.bulan < 1 || props.bulan > 12) {
      throw new Error('PeriodeAnggaran: bulan harus antara 1 dan 12');
    }
    return new PeriodeAnggaran(props);
  }

  tutup(): PeriodeAnggaran {
    return this.transisi('ditutup');
  }

  arsipkan(): PeriodeAnggaran {
    return this.transisi('diarsip');
  }

  bisaMenerimaTransaksi(): boolean {
    return this.status === 'aktif';
  }

  private transisi(target: StatusPeriode): PeriodeAnggaran {
    if (NEXT_STATUS[this.status] !== target) {
      throw new Error(
        `PeriodeAnggaran: transisi dari '${this.status}' ke '${target}' tidak diizinkan`,
      );
    }
    return new PeriodeAnggaran({ ...this.toProps(), status: target, updatedAt: new Date() });
  }

  private toProps(): PeriodeAnggaranProps {
    return {
      id: this.id,
      bulan: this.bulan,
      tahun: this.tahun,
      status: this.status,
      jenisData: this.jenisData,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
