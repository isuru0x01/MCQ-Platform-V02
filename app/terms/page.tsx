import PageWrapper from "@/components/wrapper/page-wrapper";

export default function TermsPage() {
  return (
    <PageWrapper>
      <div className="flex flex-col justify-center items-center w-full p-6">
        <h1 className="text-3xl font-bold mb-4">Terms and Conditions</h1>
        <div className="max-w-4xl text-left">
          <p className="mb-4">
            Welcome to MCQ Lab! These Terms and Conditions (&quot;Terms&quot;) govern your use of our website and services. By accessing or using our platform, you agree to comply with and be bound by these Terms. If you do not agree with these Terms, please do not use our services.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">1. Acceptance of Terms</h2>
          <p className="mb-4">
            By using MCQ Lab, you confirm that you are at least 18 years old or have the legal capacity to enter into a binding agreement. You also agree to provide accurate and complete information when using our services.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">2. Services</h2>
          <p className="mb-4">
            MCQ Lab provides an AI-powered platform that generates multiple-choice questions (MCQs) based on educational content submitted by users. We reserve the right to modify, suspend, or discontinue any part of our services at any time without notice. While we strive to ensure the accuracy of generated content, it is provided &quot;as-is&quot; and may not always be error-free or perfectly suited to all educational needs.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">3. User Responsibilities</h2>
          <p className="mb-4">
            You agree to use our services only for lawful purposes and in compliance with these Terms. You are solely responsible for the content you submit and any consequences that may arise from it. You must not:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>Submit content that is illegal, harmful, or infringes on the rights of others.</li>
            <li>Use our services to distribute spam or malicious software.</li>
            <li>Attempt to gain unauthorized access to our systems or other users&#39; accounts.</li>
            <li>Exploit the platform to generate offensive, discriminatory, or otherwise inappropriate content.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6 mb-4">4. Payments and Refunds</h2>
          <p className="mb-4">
            If you purchase a subscription or other paid services, you agree to pay all applicable fees. Payments are processed through secure third-party payment gateways (e.g., Stripe, PayPal). We do not store your payment information.
          </p>
          <p className="mb-4">
            Refunds are issued at our sole discretion and in accordance with our Refund Policy. If you believe you are entitled to a refund, please contact us at <a href="mailto:support@mcqlab.com" className="text-blue-500">support@mcqlab.com</a>.
          </p>
          <p className="mb-4">
            For subscription-based services, you can cancel your subscription at any time. However, no refunds will be issued for the remainder of the billing cycle unless otherwise specified in our Refund Policy.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">5. Intellectual Property</h2>
          <p className="mb-4">
            All content and materials on MCQ Lab, including but not limited to text, graphics, logos, and software, are the property of MCQ Lab or its licensors and are protected by intellectual property laws. You may not use, reproduce, or distribute any content without our prior written consent.
          </p>
          <p className="mb-4">
            Users retain ownership of the content they submit to MCQ Lab. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, modify, and display the content for the purposes of providing our services.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">6. Limitation of Liability</h2>
          <p className="mb-4">
            MCQ Lab is not liable for any indirect, incidental, or consequential damages arising from your use of our services. Our total liability to you for any claims related to our services is limited to the amount you paid us in the last 12 months.
          </p>
          <p className="mb-4">
            We do not guarantee uninterrupted access to our platform and are not responsible for any disruptions or data loss that may occur.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">7. Termination</h2>
          <p className="mb-4">
            We reserve the right to terminate or suspend your access to our services at any time, without notice, for any reason, including but not limited to a violation of these Terms.
          </p>
          <p className="mb-4">
            Upon termination, your right to use our services will immediately cease. Any data associated with your account may be deleted, subject to applicable data retention laws.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">8. Governing Law</h2>
          <p className="mb-4">
            These Terms are governed by the laws of Sri Lanka, without regard to its conflict of law principles. Any disputes arising from these Terms will be resolved in the courts of Sri Lanka.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">9. Changes to Terms</h2>
          <p className="mb-4">
            We may update these Terms from time to time. Any changes will be posted on this page, and your continued use of our services constitutes acceptance of the updated Terms.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">10. Contact Us</h2>
          <p className="mb-4">
            If you have any questions about these Terms, please contact us at <a href="mailto:support@mcqlab.com" className="text-blue-500">support@mcqlab.com</a>.
          </p>
        </div>
      </div>
    </PageWrapper>
  );
}
