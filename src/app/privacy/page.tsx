import Link from "next/link";

export default function Privacy() {
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
        <h2 className="mb-6 text-2xl font-bold">Privacy Policy</h2>
        <div className="space-y-6 text-gray-700">
          <section>
            <h3 className="mb-2 text-lg font-semibold">Data Collection</h3>
            <p>
              This website uses Google Analytics to collect anonymous usage
              statistics. This helps us understand how visitors interact with
              the site and improve the user experience.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-lg font-semibold">
              Information Collected
            </h3>
            <p>Google Analytics may collect:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Pages visited and time spent on each page</li>
              <li>Device type and browser information</li>
              <li>Geographic location (country/region level)</li>
              <li>Referral sources</li>
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-lg font-semibold">Cookies</h3>
            <p>
              Google Analytics uses cookies to distinguish unique users. These
              cookies do not contain personally identifiable information.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-lg font-semibold">Third-Party Services</h3>
            <p>
              We do not sell, trade, or share any visitor data with third
              parties beyond what is collected by Google Analytics for usage
              statistics.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-lg font-semibold">Contact</h3>
            <p>
              If you have questions about this privacy policy, please contact us
              at{" "}
              <a
                href="mailto:info@programmebudget.info"
                className="text-un-blue hover:underline"
              >
                info@programmebudget.info
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

