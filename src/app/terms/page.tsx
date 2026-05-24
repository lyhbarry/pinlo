import Link from "next/link";
import { LogoMark } from "@/components/logo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="font-bold text-foreground">Pinlo</span>
          </Link>
          <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: 24 May 2025</p>

        <div className="prose prose-sm max-w-none text-foreground space-y-8">

          <section>
            <h2 className="text-lg font-semibold mb-3">1. Agreement to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Pinlo (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These terms apply to all users, including individuals accessing the Service on behalf of a company or other legal entity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pinlo is a WhatsApp CRM platform that enables businesses to manage customer conversations, contacts, and sales pipelines via the WhatsApp Business Cloud API. The Service is provided on a subscription basis, with a free tier and paid Pro plan.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You must create an account to use the Service. You are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Providing accurate and complete registration information</li>
              <li>Maintaining the security of your account credentials</li>
              <li>All activity that occurs under your account</li>
              <li>Notifying us immediately of any unauthorised access</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              You must be at least 18 years old to create an account. Each workspace (tenant) is tied to one organisation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Subscriptions and Payment</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Pinlo offers a free plan and a Pro plan billed monthly (S$29/month) or annually (S$276/year). All prices are in Singapore Dollars (SGD) and inclusive of applicable taxes.
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Pro plans begin with a 14-day free trial. No credit card is required to start a trial.</li>
              <li>After the trial, you will be charged on a recurring basis unless you cancel before the trial ends.</li>
              <li>Payments are processed by Stripe. By subscribing, you agree to Stripe&apos;s terms of service.</li>
              <li>Subscriptions renew automatically. You may cancel at any time through the billing portal.</li>
              <li>We do not offer refunds for partial periods, except where required by applicable law.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Free Plan Limits</h2>
            <p className="text-muted-foreground leading-relaxed">
              The free plan is subject to usage limits including a maximum of 50 contacts, 100 messages per month, and 1 user per workspace. We reserve the right to modify free plan limits with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Send spam, unsolicited messages, or bulk promotional content in violation of WhatsApp&apos;s policies</li>
              <li>Violate any applicable laws or regulations, including Singapore&apos;s PDPA and the Spam Control Act</li>
              <li>Transmit harmful, fraudulent, defamatory, or illegal content</li>
              <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure</li>
              <li>Use the Service in any way that could damage, disable, or impair it</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              You are solely responsible for your use of the WhatsApp Business API through Pinlo and must comply with Meta&apos;s WhatsApp Business Policy at all times.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Data and Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our collection and use of your data is governed by our{" "}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>,
              which is incorporated into these Terms. You retain ownership of your customer data. By using the Service, you grant us the right to process that data as necessary to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pinlo and its original content, features, and functionality are owned by us and protected by applicable intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the Service without our express written consent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your account if you breach these Terms or engage in conduct that we reasonably determine to be harmful to the Service or other users. You may terminate your account at any time by contacting us. Upon termination, your right to use the Service ceases immediately. We may retain certain data as required by law or for legitimate business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or free of harmful components.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">11. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability for any claim arising out of or relating to these Terms or the Service shall not exceed the amount you paid us in the twelve months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">12. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by the laws of Singapore. Any disputes shall be subject to the exclusive jurisdiction of the courts of Singapore.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">13. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms from time to time. We will notify you of material changes by email or by posting a notice within the Service. Your continued use of the Service after changes take effect constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">14. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms, please contact us at{" "}
              <a href="mailto:hello@pinlo.app" className="text-primary hover:underline">hello@pinlo.app</a>.
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-border py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Pinlo. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="text-foreground font-medium">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
