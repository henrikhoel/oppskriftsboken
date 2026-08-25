import Link from "next/link";
import { siteConfig } from "@/lib/config";
import { SignOutButton } from "@/components/admin/SignOutButton";

export function AdminNav({ userEmail }: { userEmail: string | null }) {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-serif text-lg text-ink">
            {siteConfig.name} <span className="text-ink-faint">· Admin</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/admin"
              className="rounded-full px-3 py-1.5 font-medium text-ink-soft hover:bg-cream-dark hover:text-ink"
            >
              Oppskrifter
            </Link>
            <Link
              href="/admin/kategorier"
              className="rounded-full px-3 py-1.5 font-medium text-ink-soft hover:bg-cream-dark hover:text-ink"
            >
              Kategorier
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-ink-faint">
          <Link href="/" className="hover:text-ink">
            Se nettsiden
          </Link>
          {userEmail && <span className="hidden sm:inline">{userEmail}</span>}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
