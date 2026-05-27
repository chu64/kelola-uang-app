'use client';

import { useEffect, useState } from 'react';
import { useCashFlowStore } from '@/stores/cash-flow-store';
import { buatKategoriSchema } from '@/domain/cash-flow/validation/kategori-schema';
import type { Kategori } from '@/domain/cash-flow/entities/kategori';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FormState {
  nama: string;
  tipeTransaksi: 'pemasukan' | 'pengeluaran';
  alokasiDefaultJumlah: string;
}

const emptyForm: FormState = { nama: '', tipeTransaksi: 'pengeluaran', alokasiDefaultJumlah: '' };

// ── KategoriRow ───────────────────────────────────────────────────────────────

function KategoriRow({
  kategori,
  onArsipkan,
  onHapus,
}: {
  kategori: Kategori;
  onArsipkan: (id: string) => Promise<void>;
  onHapus: (id: string) => Promise<void>;
}) {
  const isSistem = kategori.asal === 'otomatis';
  const isArsip = kategori.diarsipkan;
  const aktif = !isSistem && !isArsip;

  return (
    <div
      className={[
        'group flex items-center gap-3 rounded-lg px-4 py-3 transition-colors',
        isArsip ? 'opacity-45' : 'hover:bg-stone-50 dark:hover:bg-stone-900/40',
      ].join(' ')}
    >
      {/* Dot accent */}
      <span
        className={[
          'mt-0.5 size-1.5 shrink-0 rounded-full',
          kategori.tipeTransaksi === 'pemasukan'
            ? 'bg-emerald-500'
            : 'bg-rose-500',
          isArsip ? 'opacity-40' : '',
        ].join(' ')}
      />

      {/* Nama */}
      <span
        className={[
          'flex-1 text-sm font-medium tracking-tight',
          isArsip ? 'text-stone-400 line-through' : 'text-stone-800 dark:text-stone-200',
        ].join(' ')}
      >
        {kategori.nama}
      </span>

      {/* Anggaran default */}
      <span className="hidden text-xs tabular-nums text-stone-400 sm:block">
        {kategori.alokasiDefault ? kategori.alokasiDefault.jumlah.format() : '—'}
      </span>

      {/* Badges */}
      <div className="flex shrink-0 items-center gap-1.5">
        {isSistem && (
          <Badge
            variant="secondary"
            className="rounded-sm border-0 bg-amber-100 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          >
            Sistem
          </Badge>
        )}
        {isArsip && (
          <Badge
            variant="secondary"
            className="rounded-sm border-0 bg-stone-100 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider text-stone-400"
          >
            Diarsipkan
          </Badge>
        )}
      </div>

      {/* Actions */}
      {aktif && (
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onArsipkan(kategori.id)}
            className="rounded px-2 py-1 text-xs text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
          >
            Arsipkan
          </button>
          <button
            onClick={() => onHapus(kategori.id)}
            className="rounded px-2 py-1 text-xs text-stone-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
          >
            Hapus
          </button>
        </div>
      )}
    </div>
  );
}

// ── KategoriSection ───────────────────────────────────────────────────────────

function KategoriSection({
  label,
  tipe,
  items,
  onArsipkan,
  onHapus,
}: {
  label: string;
  tipe: 'pemasukan' | 'pengeluaran';
  items: Kategori[];
  onArsipkan: (id: string) => Promise<void>;
  onHapus: (id: string) => Promise<void>;
}) {
  const accentClass =
    tipe === 'pemasukan'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-rose-600 dark:text-rose-400';

  return (
    <section>
      <div className="mb-1 flex items-center gap-3 px-4">
        <span className={`text-[11px] font-bold uppercase tracking-[0.12em] ${accentClass}`}>
          {label}
        </span>
        <span className="h-px flex-1 bg-stone-100 dark:bg-stone-800" />
        <span className="text-[11px] tabular-nums text-stone-400">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-3 text-sm text-stone-400 italic">Belum ada kategori.</p>
      ) : (
        <div className="-mx-1">
          {items.map((k) => (
            <KategoriRow
              key={k.id}
              kategori={k}
              onArsipkan={onArsipkan}
              onHapus={onHapus}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ── TambahKategoriForm ────────────────────────────────────────────────────────

function TambahKategoriForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (form: FormState) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = buatKategoriSchema.safeParse({
      nama: form.nama,
      tipeTransaksi: form.tipeTransaksi,
      alokasiDefaultJumlah: form.alokasiDefaultJumlah !== '' ? Number(form.alokasiDefaultJumlah) : null,
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
        Kategori baru
      </p>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        {/* Nama */}
        <div className="flex flex-col gap-1">
          <Input
            placeholder="Nama kategori"
            value={form.nama}
            onChange={(e) => set('nama', e.target.value)}
            className="border-stone-200 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
          />
          {errors.nama && <p className="text-xs text-rose-500">{errors.nama}</p>}
        </div>

        {/* Tipe */}
        <div className="flex flex-col gap-1">
          <Select
            value={form.tipeTransaksi}
            onValueChange={(v) => set('tipeTransaksi', v as FormState['tipeTransaksi'])}
          >
            <SelectTrigger className="w-40 border-stone-200 bg-white text-sm dark:border-stone-700 dark:bg-stone-950">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
              <SelectItem value="pemasukan">Pemasukan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Anggaran default */}
        <div className="flex flex-col gap-1">
          <Input
            type="number"
            placeholder="Anggaran default (opsional)"
            value={form.alokasiDefaultJumlah}
            onChange={(e) => set('alokasiDefaultJumlah', e.target.value)}
            min={0}
            className="w-48 border-stone-200 bg-white text-sm dark:border-stone-700 dark:bg-stone-950"
          />
          {errors.alokasiDefaultJumlah && (
            <p className="text-xs text-rose-500">{errors.alokasiDefaultJumlah}</p>
          )}
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-stone-500"
        >
          Batal
        </Button>
      </div>
    </form>
  );
}

// ── KategoriManagementClient ──────────────────────────────────────────────────

export function KategoriManagementClient() {
  const { kategoriList, isLoading, error, loadKategori, buatKategori, arsipkanKategori, hapusKategori } =
    useCashFlowStore();
  const [showForm, setShowForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void loadKategori();
  }, [loadKategori]);

  const pemasukan = kategoriList.filter((k) => k.tipeTransaksi === 'pemasukan');
  const pengeluaran = kategoriList.filter((k) => k.tipeTransaksi === 'pengeluaran');

  const handleBuat = async (form: FormState) => {
    setActionError(null);
    try {
      await buatKategori({
        nama: form.nama,
        tipeTransaksi: form.tipeTransaksi,
        alokasiDefaultJumlah: form.alokasiDefaultJumlah !== '' ? Number(form.alokasiDefaultJumlah) : null,
      });
      setShowForm(false);
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  const handleArsipkan = async (id: string) => {
    setActionError(null);
    try {
      await arsipkanKategori(id);
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  const handleHapus = async (id: string) => {
    setActionError(null);
    try {
      await hapusKategori(id);
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
            Kategori
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
          <TambahKategoriForm
            onSubmit={handleBuat}
            onCancel={() => {
              setShowForm(false);
              setActionError(null);
            }}
          />
        </div>
      )}

      {/* Error banner */}
      {(error ?? actionError) && (
        <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
          {error ?? actionError}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="py-16 text-center text-sm text-stone-400">Memuat…</div>
      )}

      {/* Category lists */}
      {!isLoading && (
        <div className="flex flex-col gap-8">
          <KategoriSection
            label="Pemasukan"
            tipe="pemasukan"
            items={pemasukan}
            onArsipkan={handleArsipkan}
            onHapus={handleHapus}
          />
          <KategoriSection
            label="Pengeluaran"
            tipe="pengeluaran"
            items={pengeluaran}
            onArsipkan={handleArsipkan}
            onHapus={handleHapus}
          />
        </div>
      )}
    </div>
  );
}
