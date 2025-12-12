import Link from "next/link";

export default function About() {
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
        <h2 className="mb-6 text-2xl font-bold">About</h2>
        <div className="space-y-4 text-gray-700">
          <p>
            The UN Budget Explorer visualizes the
            United Nations programme budget data to make it more accessible and
            understandable to the public.
          </p>
          <p>
            All data is sourced from official UN documents, specifically the
            Revised Estimates reports published by the General Assembly. The
            current visualization is based on document{" "}
            <a
              href="https://docs.un.org/en/A/80/400"
              target="_blank"
              rel="noopener noreferrer"
              className="text-un-blue hover:underline"
            >
              A/80/400
            </a>
            .
          </p>
          <p>
            This website is not an official United Nations website.
          </p>
        </div>
      </main>
    </div>
  );
}

