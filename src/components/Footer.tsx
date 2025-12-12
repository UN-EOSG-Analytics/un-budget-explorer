import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-gray-50">
      <div className="container-padding mx-auto max-w-[1400px] py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            <strong>Disclaimer:</strong> This is an unofficial website created
            for informational purposes only.
          </p>
          <nav className="flex gap-4 text-sm text-gray-600">
            <Link href="/about" className="hover:text-un-blue">
              About
            </Link>
            <Link href="/contact" className="hover:text-un-blue">
              Contact
            </Link>
            <Link href="/privacy" className="hover:text-un-blue">
              Privacy
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
