import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_top,#4f46e5_0%,#2f1a54_42%,#111827_100%)] px-6 py-10">
      <section className="w-full max-w-4xl rounded-3xl border border-white/20 bg-black/35 px-8 py-6 shadow-2xl backdrop-blur-xl">
        <h1 className="text-3xl font-semibold uppercase tracking-[0.24em] text-white">beam</h1>
      </section>
    </main>
  );
}
