import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-700 hover:text-indigo-600 transition-colors"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white text-xs font-bold">
              R
            </span>
            <span className="text-sm font-semibold">ReserveIt</span>
          </Link>
          <p className="text-sm text-slate-500">
            &copy; {year} ReserveIt. Resource Reservation Management System.
          </p>
        </div>
      </div>
    </footer>
  );
}
