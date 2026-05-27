import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Kelola Uang</h1>
          <p className="text-muted-foreground">Personal finance tracker.</p>
        </div>
        <nav className="flex flex-col gap-2">
          <Button asChild variant="outline" className="w-fit">
            <Link href="/cash-flow/kategori">Manajemen Kategori</Link>
          </Button>
        </nav>
      </div>
    </div>
  )
}
