import Link from "next/link";
import { LogoMark } from "@/components/logo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="font-bold text-foreground">Pinlo</span>
          </Link>
          <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Terms of Service
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: 24 May 2025</p>

        <div className="space-y-8">

          <section>
            <h2 className="text-lg font-semibold mb-3">1. Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pinlo (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting your personal data. This Privacy Policy explains what data we collect, how we use it, and your rights under Singapore&apos;s Personal Data Protection Act 2012 (PDPA) and other applicable laws. By using Pinlo, you consent to the practices described here.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Data We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We collect the following categories of data:</p>

            <h3 className="font-medium text-foreground mb-2">Account Data</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
              <li>Name and email address (when you sign up)</li>
              <li>Organisation name</li>
              <li>Payment information (processed and stored by Stripe — we do not store card details)</li>
            </ul>

            <h3 className="font-medium text-foreground mb-2">WhatsApp & Customer Data</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
              <li>Incoming and outgoing WhatsApp messages routed through your connected number</li>
              <li>Contact names and phone numbers of your customers as received via WhatsApp</li>
              <li>Notes, tags, and pipeline data you add to contacts within Pinlo</li>
            </ul>

            <h3 className="font-medium text-foreground mb-2">Usage Data</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Log data including IP address, browser type, and pages visited</li>
              <li>Feature usage and interaction data to improve the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>To provide, operate, and maintain the Service</li>
              <li>To process payments and manage subscriptions</li>
              <li>To send transactional emails (account invites, billing receipts)</li>
              <li>To respond to support requests</li>
              <li>To monitor and improve service performance and security</li>
              <li>To comply with legal obligations</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We do not sell your personal data or your customers&apos; data to third parties. We do not use your customers&apos; WhatsApp messages for advertising or marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We share data with the following third parties only as necessary to provide the Service:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Supabase</span> — database and authentication infrastructure. Data is stored in AWS ap-northeast-2 (Seoul).
              </li>
              <li>
                <span className="font-medium text-foreground">Stripe</span> — payment processing. Stripe stores payment card details on our behalf under PCI-DSS compliance.
              </li>
              <li>
                <span className="font-medium text-foreground">Meta (WhatsApp Business Cloud API)</span> — message delivery and receipt. Your use of WhatsApp through Pinlo is also subject to Meta&apos;s Privacy Policy and WhatsApp Business Policy.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your account data for as long as your account is active or as needed to provide the Service. Message and contact data is retained until you delete it or close your account. After account closure, we may retain data for up to 90 days before deletion, unless longer retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organisational measures to protect your data, including encrypted data transmission (TLS), access controls, and row-level security at the database level. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Your Rights (PDPA)</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Under Singapore&apos;s PDPA, you have the right to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate or incomplete personal data</li>
              <li>Withdraw consent to the collection, use, or disclosure of your personal data (note: this may affect your ability to use the Service)</li>
              <li>Request deletion of your personal data, subject to legal retention obligations</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:hello@pinlo.app" className="text-primary hover:underline">hello@pinlo.app</a>.
              We will respond within 10 business days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential session cookies to keep you logged in and to maintain your authentication state. We do not use advertising or third-party tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not directed at individuals under the age of 18. We do not knowingly collect personal data from children. If you believe we have inadvertently collected such data, please contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes by email or by posting a notice in the Service. Continued use of the Service after changes take effect constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">11. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy-related questions or to exercise your rights, contact our Data Protection Officer at{" "}
              <a href="mailto:hello@pinlo.app" className="text-primary hover:underline">hello@pinlo.app</a>.
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-border py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Pinlo. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="text-foreground font-medium">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
