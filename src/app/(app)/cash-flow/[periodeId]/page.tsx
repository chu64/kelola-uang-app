interface Props {
  params: Promise<{ periodeId: string }>;
}

export default async function PeriodeDetailPage({ params }: Props) {
  const { periodeId } = await params;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-stone-400">
        Kelola Uang · Periode
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
        Detail Periode
      </h1>
      <p className="mt-4 text-sm text-stone-400 font-mono">{periodeId}</p>
    </div>
  );
}
