'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCashFlowStore } from '@/stores/cash-flow-store';
import { buatPeriodeAnggaranSchema } from '@/domain/cash-flow/validation/periode-anggaran-schema';
import type { PeriodeAnggaran, StatusPeriode } from '@/domain/cash-flow/entities/periode-anggaran';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

// ── helpers ───────────────────────────────────────────────────────────────────

const NAMA_BULAN = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function labelBulanTahun(bulan: number, tahun: number): string {
  return `${NAMA_BULAN[bulan]} ${tahun}`;
}

const STATUS_LABEL: Record<StatusPeriode, string> = {
  aktif: 'Aktif',
  ditutup: 'Ditutup',
  diarsip: 'Diarsip',
};

const STATUS_CLASS: Record<StatusPeriode, string> = {
  aktif: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  ditutup: 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
  diarsip: 'bg-stone-100 text-stone-400 dark:bg-stone-800/50 dark:text-stone-500',
};

// ── PeriodeRow ────────────────────────────────────────────────────────────────

function PeriodeRow({ periode }: { periode: PeriodeAnggaran }) {
  return (
    <Link
      href={`/cash-flow/${periode.id}`}
      className={[
        'flex items-center gap-4 rounded-lg px-4 py-3.5 transition-colors',
        'hover:bg-stone-50 dark:hover:bg-stone-900/40',
        periode.status === 'diarsip' ? 'opacity-50' : '',
      ].join(' ')}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-800 dark:text-stone-200 tracking-tight">
          {labelBulanTahun(periode.bulan, periode.tahun)}
        </p>
        <p className="text-xs text-stone-400 tabular-nums mt-0.5">
          {periode.jenisData === 'historis' ? 'Historis' : 'Realtime'}
        </p>
      </div>
      <Badge
        variant="secondary"
        className={[
          'rounded-sm border-0 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider shrink-0',
          STATUS_CLASS[periode.status],
        ].join(' ')}
      >
        {STATUS_LABEL[periode.status]}
      </Badge>
      <span className="text-stone-300 dark:text-stone-600 text-sm">›</span>
    </Link>
  );
}

// ── BuatPeriodeForm ───────────────────────────────────────────────────────────

interface FormState {
  bulan: string;
  tahun: string;
  jenisData: 'realtime' | 'historis';
}

const now = new Date();
const emptyForm: FormState = {
  bulan: String(now.getMonth() + 1),
  tahun: String(now.getFullYear()),
  jenisData: 'realtime',
};

function BuatPeriodeForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (form: FormState) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = buatPeriodeAnggaranSchema.safeParse({
      bulan: Number(form.bulan),
      tahun: Number(form.tahun),
      jenisData: form.jenisData,
    });

    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? 'root';
        errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900/50"
    >
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-stone-400">
        Periode baru
      </p>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        {/* Bulan */}
        <div className="flex flex-col gap-1">
          <Select value={form.bulan} onValueChange={(v) => setField('bulan', v)}>
            <SelectTrigger className="border-stone-200 bg-white text-sm dark:border-stone-700 dark:bg-stone-950">
              <SelectValue placeholder="Bulan" />
            </SelectTrigger>
            <SelectContent>
              {NAMA_BULAN.slice(1).map((nama, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.bulan && <p className="text-xs text-rose-500">{errors.bulan}</p>}
        </div>

        {/* Tahun */}
        <div className="flex flex-col gap-1">
          <Input
            type="number"
            placeholder="Tahun"
            value={form.tahun}
            onChange={(e) => setField('tahun', e.target.value)}
            min={2020}
            max={2099}
            className="border-stone-200 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
          />
          {errors.tahun && <p className="text-xs text-rose-500">{errors.tahun}</p>}
        </div>

        {/* Jenis data */}
        <div className="flex flex-col gap-1">
          <Select
            value={form.jenisData}
            onValueChange={(v) => setField('jenisData', v as FormState['jenisData'])}
          >
            <SelectTrigger className="border-stone-200 bg-white text-sm dark:border-stone-700 dark:bg-stone-950">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">Realtime</SelectItem>
              <SelectItem value="historis">Historis</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          type="submit"
          disabled={submitting}
          size="sm"
          className="bg-stone-800 text-stone-50 hover:bg-stone-700 dark:bg-stone-200 dark:text-stone-900 dark:hover:bg-stone-100"
        >
          {submitting ? 'Menyimpan…' : 'Simpan'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="text-stone-500">
          Batal
        </Button>
      </div>
    </form>
  );
}

// ── PeriodeListClient ─────────────────────────────────────────────────────────

export function PeriodeListClient() {
  const { periodeList, isPeriodeLoading, periodeError, loadPeriode, buatPeriode } =
    useCashFlowStore();
  const [showForm, setShowForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void loadPeriode();
  }, [loadPeriode]);

  const handleBuat = async (form: FormState) => {
    setActionError(null);
    try {
      await buatPeriode({
        bulan: Number(form.bulan),
        tahun: Number(form.tahun),
        jenisData: form.jenisData,
      });
      setShowForm(false);
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-stone-400">
            Kelola Uang
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Periode Anggaran
          </h1>
        </div>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
            className="bg-stone-900 text-stone-50 hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
          >
            + Tambah
          </Button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="mb-6">
          <BuatPeriodeForm
            onSubmit={handleBuat}
            onCancel={() => {
              setShowForm(false);
              setActionError(null);
            }}
          />
        </div>
      )}

      {/* Error banner */}
      {(periodeError ?? actionError) && (
        <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
          {periodeError ?? actionError}
        </div>
      )}

      {/* Loading */}
      {isPeriodeLoading && (
        <div className="py-16 text-center text-sm text-stone-400">Memuat…</div>
      )}

      {/* List */}
      {!isPeriodeLoading && (
        <>
          {periodeList.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-stone-400">Belum ada periode anggaran.</p>
              <p className="mt-1 text-xs text-stone-300 dark:text-stone-600">
                Buat periode pertama untuk mulai mencatat.
              </p>
            </div>
          ) : (
            <div className="-mx-1">
              {periodeList.map((p) => (
                <PeriodeRow key={p.id} periode={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
