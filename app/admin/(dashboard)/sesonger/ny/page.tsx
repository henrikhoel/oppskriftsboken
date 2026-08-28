import type { Metadata } from "next";
import { SeasonForm } from "@/components/admin/SeasonForm";

export const metadata: Metadata = { title: "Ny sesong" };

export default function NewSeasonPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 font-serif text-2xl text-ink sm:text-3xl">Ny sesong</h1>
      <SeasonForm />
    </div>
  );
}
