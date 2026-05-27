# CLAUDE.md — Kelola Uang

Personal finance app built with Domain-Driven Design. This document is the authoritative reference for all implementation work. Read it before writing any code.

---

## What This App Does

Three concrete problems drive the design:

1. **Cash flow invisibility** — users can't see where their money goes month to month.
2. **Debt spiral** — no buffer means every unexpected expense becomes new debt.
3. **Hidden consequences** — opening new debt feels like relief, not a future expense burden.

The app is a **workflow system**, not a ledger. Learning happens as a side effect of taking real actions.

---

## Non-Negotiable Architecture Rules

1. **Indonesian identifiers in code.** All class names, function names, variable names, DB columns, and UI text use the Indonesian terms defined in this document. No English equivalents in code.
2. **Derived values are never stored.** `Margin`, `SaldoUtang`, `SaldoBuffer`, `RasioUtangPenghasilan`, `PersentaseTercapai` are always computed from stored data. Never add a column for them.
3. **Bounded contexts never import from each other.** Cash Flow, Debt, Buffer, and Decision contexts communicate only through Domain Events via the shared event bus.
4. **Domain logic lives in `src/domain/`, not in UI components.** React components display data and accept input. All business rules and calculations stay in the domain layer.
5. **TypeScript strict mode.** No `any`. No `!` non-null assertions except in repository transform functions.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Storage | IndexedDB via Dexie.js (local-first, no backend) |
| Language | TypeScript strict |
| State | Zustand (one store per bounded context) |
| Validation | Zod (enforces domain invariants at system boundaries) |

Data never leaves the user's device. No authentication, no server, no cloud sync in this phase.

---

## Four Bounded Contexts

### 1. Cash Flow Context (`src/domain/cash-flow/`)

**What it owns:** all money movement — in and out — within a time period.

**Aggregate Root:** `PeriodeAnggaran` — one calendar month. All transactions only mean something within a period.

| Concept | Indonesian term | DDD type | Notes |
|---|---|---|---|
| Budget period | `PeriodeAnggaran` | Aggregate Root | Default = one calendar month |
| Transaction | `Transaksi` | Entity (abstract) | Two subtypes: `Pemasukan`, `Pengeluaran` |
| Income | `Pemasukan` | Entity | Must use a `pemasukan`-type `Kategori` |
| Expense | `Pengeluaran` | Entity | Must use a `pengeluaran`-type `Kategori` |
| Category | `Kategori` | Entity | Has `sumber` (sistem/pengguna) and `asal` (manual/otomatis) |
| Budget allocation | `AlokasiKategori` | Entity | "Intended budget" for a category in a specific period |
| Default allocation | `AlokasiDefault` | Value Object | Template on `Kategori`; copied to new periods automatically |
| Period type | `JenisData` | Value Object | `realtime` (current month) or `historis` (backfilled) |
| Money | `Uang` | Value Object | `{ jumlah: number, matauang: 'IDR' }` — never a bare number |
| Surplus/deficit | `Margin` | Derived Value | `TotalPemasukan - TotalPengeluaran` — never stored |

**Invariants:**
- No two `PeriodeAnggaran` with the same `bulan` + `tahun` per user.
- `PeriodeAnggaran` with status `ditutup` or `diarsip` cannot accept new transactions.
- `Kategori` with `asal = otomatis` (`CicilanUtang`, `KontribusiBuffer`) cannot be selected manually by users.
- `Kategori` that has transactions cannot be deleted — only archived (`diarsipkan = true`).
- `Transaksi` with `asal = otomatis` cannot be edited or deleted by the user.
- `Margin` is always computed, never stored.

**Domain Events produced:** `PeriodeAnggaranDibuat`, `TransaksiDicatat`, `AlokasiTerlampaui`, `MarginNegatif`

**Domain Events consumed:**
- `PembayaranCicilanDilakukan` → creates an automatic `Pengeluaran` with `kategoriId = 'sistem:cicilan-utang'`
- `KontribusiDilakukan` → creates an automatic `Pengeluaran` with `kategoriId = 'sistem:kontribusi-buffer'`

---

### 2. Debt Context (`src/domain/debt/`)

**What it owns:** financial obligations with a time dimension — balance, schedule, payment history.

**Aggregate Root:** `Utang` — each debt is independent and can span years across many budget periods.

| Concept | Indonesian term | DDD type | Notes |
|---|---|---|---|
| Debt | `Utang` | Aggregate Root | |
| Debt type | `JenisUtang` | Value Object | `pinjolOnline`, `pinjamanTeman`, `cicilanBarang` |
| Debt structure | `StrukturUtang` | Value Object | Immutable after `Utang` is created |
| Payment | `Pembayaran` | Entity | Has `jenisPembayaran` and `statusKetepatan` |
| Payment schedule | `JadwalCicilan` | Derived Structure | Computed on creation; recomputed after extra payments |
| Schedule entry | `EntriJadwal` | Value Object | One installment: `nomorCicilan`, `tanggalJatuhTempo`, `jumlahPokok`, `jumlahBunga`, `jumlahTotal` |
| Current balance | `SaldoUtang` | Derived Value | `pokokAwal + TotalBungaTerakumulasi - totalPembayaranPokok` — never stored |
| Interest method | `MetodeBunga` | Value Object | `flat`, `efektif`, `tanpaBunga` |
| Installment type | `JenisCicilan` | Value Object | `tetap` (fixed schedule) or `fleksibel` (no schedule) |
| Minimum payment | `CicilanMinimum` | Value Object | Only exists when `jenisCicilan = tetap` |
| Late fee | `DendaKeterlambatan` | Value Object | Optional; `jenisHitungan` + `nilai` |
| Payment timing | `StatusKetepatan` | Value Object | `tepat`, `terlambat`, `lebihAwal` |
| Debt status | `StatusUtang` | Value Object | `aktif`, `lunas` (auto-set), `bermasalah` |

**Debt type presets:**

| `JenisUtang` | `MetodeBunga` | `JenisCicilan` | `DendaKeterlambatan` | Extra |
|---|---|---|---|---|
| `pinjolOnline` | `flat` or `efektif` | `tetap` | active | — |
| `pinjamanTeman` | `tanpaBunga` | `fleksibel` | none | — |
| `cicilanBarang` | `flat` | `tetap` | none | `namaBarang` |

**Invariants:**
- `StrukturUtang` cannot be modified after `Utang` is created. Changing loan terms = close old debt, open new one.
- `Pembayaran.jumlah` cannot exceed `SaldoUtang` at the time of payment.
- `Pembayaran` cannot be deleted after creation (audit trail). Corrections require a new corrective entry.
- `StatusUtang` transitions to `lunas` automatically when `SaldoUtang` reaches zero — never set manually.
- `JadwalCicilan` only exists for debts where `jenisCicilan = tetap`.

**Domain Events produced:** `UtangBaruDibuka`, `PembayaranCicilanDilakukan`, `CicilanTerlewat`, `UtangLunas`, `JadwalCicilanDirevisi`

**Domain Events consumed:** none.

---

### 3. Buffer Context (`src/domain/buffer/`)

**What it owns:** targeted savings being built incrementally — emergency fund and sinking funds.

**Aggregate Root:** `Buffer` — each buffer is independent.

| Concept | Indonesian term | DDD type | Notes |
|---|---|---|---|
| Buffer | `Buffer` | Aggregate Root | |
| Behavior | `PerilakuBuffer` | Value Object | `akumulasiSekali` (emergency fund) or `siklusRutin` (sinking fund) |
| Target type | `JenisTarget` | Value Object | `tetap` (known exact amount) or `estimasi` (approximate) |
| Contribution | `Kontribusi` | Entity | Each addition to balance; triggers a Cash Flow auto-expense |
| Withdrawal | `Pencairan` | Entity | Using the buffer; does NOT create a new expense (would be double-counting) |
| Contribution schedule | `KontribusiRutin` | Value Object | Optional: `jumlah` + `frekuensi` (`bulanan`, `mingguan`, `setiapGajian`) |
| Contribution type | `JenisKontribusi` | Value Object | `rutin` or `ekstra` |
| Current balance | `SaldoBuffer` | Derived Value | `totalKontribusi - totalPencairan` — never stored |
| Target progress | `PersentaseTercapai` | Derived Value | `SaldoBuffer / target * 100` — never stored |
| Completion estimate | `ProyeksiTercapai` | Derived Value | Based on `KontribusiRutin` or 3-month average — null if no rhythm set |

**Why `Pencairan` does not create a new `Pengeluaran`:** the expense was already recorded incrementally through each `Kontribusi`. Recording it again at withdrawal would double-count it. This is the core psychological mechanism of sinking funds — pain is distributed across many small periods.

**Invariants:**
- `Pencairan.jumlah` cannot exceed `SaldoBuffer` at the time of withdrawal. Buffers cannot go negative.
- `Kontribusi` cannot be deleted after creation. Corrections require a new entry with audit trail.
- For `perilaku = siklusRutin`: after full withdrawal, saldo resets and a new cycle begins (emits `SiklusBufferDireset`).

**Domain Events produced:** `BufferDibuat`, `KontribusiDilakukan`, `TargetBufferTercapai`, `PencairanDilakukan`, `SiklusBufferDireset`

**Domain Events consumed:** none.

---

### 4. Decision Context (`src/domain/decision/`)

**What it owns:** holistic financial health evaluation and structured decision support.

**Sifat unik:** mostly stateless in operation — it reads, processes, and outputs without changing state elsewhere. Only persistence is the session record.

**Aggregate Root:** `SesiKeputusan` — one decision episode with a persistent identity for history and learning.

| Concept | Indonesian term | DDD type | Notes |
|---|---|---|---|
| Decision session | `SesiKeputusan` | Aggregate Root | One episode; stores snapshot, mode, topic, output, final decision |
| Financial snapshot | `SnapshotKondisiFinansial` | Value Object | Compiled from all contexts before each session; stored as JSON with the session |
| Financial profile | `ProfilKeuangan` | Singleton Entity | User-declared baseline: `PenghasilanTetapBulanan`, `tanggungan`, `toleransiRisiko` |
| Session mode | `ModeMasuk` | Value Object | `rekomendasi` (direct output) or `pemanduan` (guided conversation) |
| Decision topic | `TopikKeputusan` | Value Object | `alokasiSurplus`, `utangBaru`, `prioritasPelunasan`, `kondisiDarurat` |
| Recommendation | `Rekomendasi` | Value Object | Action in concrete numbers + reason + `ProyeksiDampak` + priority |
| Impact projection | `ProyeksiDampak` | Value Object | "This debt clears 2 months earlier" / "DTI drops from 38% to 34%" |
| Guided conversation | `AlurPemanduan` | Entity | Adaptive Q&A; state evolves as user answers; may end with `Rekomendasi` |
| Guided question | `PertanyaanPemandu` | Value Object | Three components always present: `teks`, `konteks` (real numbers), `implikasi` (why it matters) |
| User's final choice | `KeputusanFinal` | Entity | What the user ultimately decided; always present in a completed session |
| Decision logic | `DecisionRule` | Domain Policy | Encoded financial knowledge evaluated against `SnapshotKondisiFinansial` |
| Conversation logic | `DecisionTree` | Domain Service | Determines next question based on previous answer |

**Derived signals in `SnapshotKondisiFinansial`:**

| Signal | Indonesian term | Formula |
|---|---|---|
| Debt-to-income ratio | `RasioUtangPenghasilan` | `TotalCicilanBulanan / PenghasilanTetapBulanan * 100` |
| True free cash | `MarginBersih` | `Margin - TotalCicilanBulanan` |
| Emergency readiness | `SkorKesiapanDarurat` | `% of emergency Buffer filled (0 if none exists)` |
| Spending trend | `TrendMargin` | `membaik` / `stabil` / `memburuk` vs 3-month average |
| Leaking categories | `KategoriBocar` | Categories consistently over-budget for last N periods |

**Encoded decision rules:**

| Rule | `AturanDTI` | DTI < 20% = safe, 20–35% = caution, > 35% = danger |
|---|---|---|
| | `AturanPrioritasDaruratDulu` | While emergency fund < 100% and DTI not in danger zone, surplus → emergency buffer first |
| | `AturanAvalanche` | Extra debt payments prioritized by highest interest rate |
| | `AturanKonsekuensiUtangBaru` | Compute projected DTI before confirming new debt; warn if it crosses a threshold |

**Important:** `PenghasilanTetapBulanan` is user-declared, not a historical average. It represents the capacity the user believes they have, not a distortion from past anomalies.

**Domain Events produced:** `RekomendasiDihasilkan`, `KeputusanFinalDicatat`, `SinyalBerbahayaTerdeteksi`

**Domain Events consumed:** reads all contexts indirectly via `SnapshotKondisiFinansial`.

---

## Information Flow

```
Cash Flow Context ──┐
                    ├──► Decision Context (read-only via snapshot)
Debt Context ───────┤
                    │
Buffer Context ─────┘
```

Cash Flow, Debt, and Buffer only produce events. Decision only consumes. No cycles.

Cross-context writes happen only through the event bus:
- `PembayaranCicilanDilakukan` → Cash Flow auto-creates expense
- `KontribusiDilakukan` → Cash Flow auto-creates expense

---

## Folder Structure

```
src/
├── app/                            # Next.js App Router — pages and routing only
│   ├── (onboarding)/setup/         # First-run profile setup
│   └── (app)/
│       ├── dashboard/
│       ├── cash-flow/[periodId]/
│       ├── debt/[utangId]/
│       ├── buffer/[bufferId]/
│       └── keputusan/
│
├── domain/                         # All business logic — zero framework dependencies
│   ├── shared/
│   │   ├── value-objects/uang.ts   # Uang value object — used across all contexts
│   │   └── events/event-bus.ts     # Pub/sub event bus (singleton)
│   ├── cash-flow/
│   │   ├── entities/               # PeriodeAnggaran (AR), Transaksi, Kategori, AlokasiKategori
│   │   ├── value-objects/          # JenisData, StatusPeriode, AsalTransaksi
│   │   ├── events/                 # PeriodeAnggaranDibuat, TransaksiDicatat, AlokasiTerlampaui, MarginNegatif
│   │   ├── services/cash-flow-calculator.ts
│   │   └── seeds/kategori-sistem.ts
│   ├── debt/
│   │   ├── entities/               # Utang (AR), Pembayaran
│   │   ├── value-objects/          # StrukturUtang, JenisUtang, MetodeBunga, JenisCicilan, DendaKeterlambatan, StatusUtang
│   │   ├── derived/                # saldo-utang.ts, jadwal-cicilan.ts, proyeksi-pelunasan.ts
│   │   ├── events/                 # UtangBaruDibuka, PembayaranCicilanDilakukan, CicilanTerlewat, UtangLunas, JadwalCicilanDirevisi
│   │   └── services/debt-calculator.ts
│   ├── buffer/
│   │   ├── entities/               # Buffer (AR), Kontribusi, Pencairan
│   │   ├── value-objects/          # PerilakuBuffer, JenisTarget, KontribusiRutin
│   │   ├── derived/                # saldo-buffer.ts, proyeksi-tercapai.ts
│   │   └── events/                 # BufferDibuat, KontribusiDilakukan, TargetBufferTercapai, PencairanDilakukan, SiklusBufferDireset
│   └── decision/
│       ├── entities/               # SesiKeputusan (AR), AlurPemanduan, ProfilKeuangan (singleton)
│       ├── value-objects/          # SnapshotKondisiFinansial, Rekomendasi, ProyeksiDampak, PertanyaanPemandu, TopikKeputusan, ModeMasuk
│       ├── rules/                  # aturan-dti.ts, aturan-prioritas-darurat-dulu.ts, aturan-avalanche.ts, aturan-konsekuensi-utang-baru.ts
│       ├── trees/                  # tree-alokasi-surplus.ts, tree-utang-baru.ts, tree-prioritas-pelunasan.ts, tree-kondisi-darurat.ts
│       ├── events/                 # RekomendasiDihasilkan, KeputusanFinalDicatat, SinyalBerbahayaTerdeteksi
│       └── services/snapshot-builder.ts
│
├── infrastructure/
│   ├── db/schema.ts                # Dexie.js schema — see DB Schema section below
│   ├── repositories/               # One repo per Aggregate Root
│   │   ├── periode-anggaran-repository.ts
│   │   ├── kategori-repository.ts
│   │   ├── utang-repository.ts
│   │   ├── buffer-repository.ts
│   │   ├── sesi-keputusan-repository.ts
│   │   └── profil-keuangan-repository.ts
│   └── event-handlers/             # Cross-context event reactions
│       ├── on-pembayaran-cicilan-dilakukan.ts
│       └── on-kontribusi-dilakukan.ts
│
├── stores/                         # Zustand — one store per bounded context
│   ├── cash-flow-store.ts
│   ├── debt-store.ts
│   ├── buffer-store.ts
│   └── decision-store.ts
│
└── components/
    ├── shared/                     # UangDisplay, TrendIndicator, SinyalDTI
    ├── cash-flow/
    ├── debt/
    ├── buffer/
    └── decision/
```

---

## Database Schema (Dexie.js / IndexedDB)

Only non-derivable data is stored. `Margin`, `SaldoUtang`, `SaldoBuffer` have no columns.

`StrukturUtang` and `KontribusiRutin` are flattened to separate columns — IndexedDB cannot query nested objects. The domain layer treats them as Value Objects; repositories handle the transform.

```typescript
// Key indexes — full schema in src/infrastructure/db/schema.ts
periodeAnggaran:  'id, &[bulan+tahun], status'          // &[bulan+tahun] enforces uniqueness invariant
transaksi:        'id, periodeAnggaranId, tipe, tanggal, kategoriId'
kategori:         'id, tipeTransaksi, sumber, asal'
alokasiKategori:  'id, periodeAnggaranId, kategoriId, &[periodeAnggaranId+kategoriId]'
utang:            'id, jenisUtang, status, tanggalMulai'
pembayaran:       'id, utangId, tanggal, jenisPembayaran'
buffer:           'id, perilaku, status'
kontribusi:       'id, bufferId, tanggal'               // stores transaksiId for traceability
pencairan:        'id, bufferId, tanggal'
profilKeuangan:   'id'                                  // always id = 'singleton'
sesiKeputusan:    'id, tanggalDibuat, topikKeputusan, selesai'
```

`snapshotJson`, `outputJson`, `keputusanFinalJson` on `sesiKeputusan` are stored as JSON strings — complex structure, never queried by column.

---

## Key Patterns

### Repository pattern
Each Aggregate Root has one repository. Repositories handle all IndexedDB ↔ domain entity transformation. Domain code never touches Dexie directly.

```typescript
// Domain code calls this:
const utang = await utangRepo.findById(id);   // returns domain Utang entity
await utangRepo.save(utang);                   // accepts domain Utang entity

// Repository internally flattens/reconstructs StrukturUtang
```

### Event bus
In-memory singleton. Handlers registered at app initialization.

```typescript
eventBus.subscribe<PembayaranCicilanDilakukan>('PembayaranCicilanDilakukan', async (event) => {
  // Cash Flow reacts — creates auto Pengeluaran
});
```

### Zustand store pattern
One store per bounded context. Stores expose:
- loaded data arrays
- `load*()` actions that call repositories
- mutation actions that enforce invariants then call repositories then publish events
- derived getter functions (never stored in state)

### Derived values
Computed functions, not stored state. Located in `domain/*/derived/`. Called by stores and components as needed.

---

## Current Implementation Scope

**Phase 0 (foundation — no user-visible features):**
- [ ] Next.js project setup with TypeScript strict
- [ ] Dexie.js schema (`src/infrastructure/db/schema.ts`)
- [ ] `Uang` value object (`src/domain/shared/value-objects/uang.ts`)
- [ ] Event bus (`src/domain/shared/events/event-bus.ts`)

**Phase 1 (Cash Flow Context — usable as a basic tracker):**
- [ ] `Kategori` entity + system seed data (`CicilanUtang`, `KontribusiBuffer` as `asal = otomatis`)
- [ ] `PeriodeAnggaran` aggregate root with CRUD
- [ ] `Transaksi` entity (both `Pemasukan` and `Pengeluaran`)
- [ ] `AlokasiKategori` entity
- [ ] `Margin` derived value calculation
- [ ] `KategoriRepository`, `PeriodeAnggaranRepository`
- [ ] `cash-flow-store.ts`
- [ ] Cash Flow pages: period list, period detail with transactions, category allocation status

Everything else (Debt, Buffer, Decision) comes after Phase 1 is working and being used.

---

## Out of Scope (This Phase)

- Cloud sync / backend / authentication
- Multi-currency (architecture supports it via `Uang.matauang`, but only `IDR` implemented)
- Investment / passive income (planned as 5th bounded context, not designed yet)
- `AlurPemanduan` full decision tree implementation (Decision Context routes exist but trees are not implemented)
- Export / import data
