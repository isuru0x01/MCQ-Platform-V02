import PageWrapper from "@/components/wrapper/page-wrapper";

export default function PrivacyPage() {
  return (
    <PageWrapper>
      <div className="flex flex-col justify-center items-center w-full p-6">
        <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
        <div className="max-w-4xl text-left">
          <p className="mb-4">
            Your privacy is important to us. It is MCQ Lab&apos;s policy to respect your privacy regarding any information we may collect from you across our website, <a href="mcqlabs.click" className="text-blue-500">mcqlabs.click</a>, and other sites we own and operate.
          </p>
          <p className="mb-4">
            <strong>1. Information We Collect</strong>
            <br />
            We may collect personal information including, but not limited to:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>Name and contact details (email, phone number, etc.).</li>
            <li>Account details (username, password).</li>
            <li>Usage data (IP address, browser type, pages visited, etc.).</li>
          </ul>
          <p className="mb-4">
            <strong>2. How We Use Information</strong>
            <br />
            We collect and use your information only where:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>It&apos;s necessary to provide and operate our services.</li>
            <li>It satisfies a legitimate interest (which is not overridden by your data protection interests).</li>
            <li>We have your consent to do so.</li>
            <li>We are legally obligated to collect or disclose the data.</li>
          </ul>
          <p className="mb-4">
            <strong>3. Data Sharing and Disclosure</strong>
            <br />
            We do not share personal information publicly or with third parties, except in the following cases:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>When required to by law or in response to valid legal processes.</li>
            <li>With trusted service providers that assist in our operations (under strict data protection agreements).</li>
          </ul>
          <p className="mb-4">
            <strong>4. Data Retention</strong>
            <br />
            We retain personal data only for as long as necessary to fulfill the purposes outlined in this policy. When we no longer need your data, we will securely delete or anonymize it.
          </p>
          <p className="mb-4">
            <strong>5. Your Rights</strong>
            <br />
            Under the GDPR, you have the following rights regarding your personal data:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>The right to access, correct, or delete your data.</li>
            <li>The right to object to the processing of your data.</li>
            <li>The right to data portability.</li>
            <li>The right to withdraw consent at any time.</li>
            <li>The right to lodge a complaint with a supervisory authority.</li>
          </ul>
          <p className="mb-4">
            To exercise your rights, please contact us at <a href="mailto:info@mcqlabs.click" className="text-blue-500">info@mcqlabs.click</a>.
          </p>
          <p className="mb-4">
            <strong>6. External Links</strong>
            <br />
            Our website may link to external sites that are not operated by us. Please be aware that we have no control over the content and practices of these sites, and cannot accept responsibility or liability for their respective privacy policies.
          </p>
          <p className="mb-4">
            <strong>7. Updates to This Policy</strong>
            <br />
            We may update this privacy policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. The latest version will always be available on our website.
          </p>
          <p className="mb-4">
            This policy is effective as of <strong>28th December 2024</strong>.
          </p>
          <p className="mb-4">
            If you have any questions or concerns about this policy, please contact us at <a href="mailto:info@mcqlabs.click" className="text-blue-500">info@mcqlabs.click</a>.
          </p>
        </div>
      </div>
    </PageWrapper>
  );
}
