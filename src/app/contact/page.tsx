import Link from "next/link";

export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-gray-200 bg-white">
        <div className="container-padding mx-auto max-w-[1400px] pt-4 pb-2">
          <Link href="/" className="hover:opacity-80">
            <h1 className="text-2xl text-foreground sm:text-3xl">
              <span className="font-bold">UN Budget</span>{" "}
              <span className="font-base">Explorer</span>
            </h1>
          </Link>
        </div>
      </header>

      <main className="container-padding mx-auto max-w-[800px] py-12">
        <h2 className="mb-6 text-2xl font-bold">Contact</h2>
        <div className="space-y-4 text-gray-700">
          <p>
            For questions, feedback, or suggestions about the UN Budget
            Explorer, please contact us at:
          </p>
          <p>
            <a
              href="mailto:info@programmebudget.info"
              className="text-un-blue hover:underline"
            >
              info@programmebudget.info
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

