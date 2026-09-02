import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex h-full w-full flex-col items-center justify-center gap-4 bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="text-zinc-500">The page you were looking for doesn’t exist.</p>
      <Link
        href="/"
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Back to the app
      </Link>
    </main>
  );
}
