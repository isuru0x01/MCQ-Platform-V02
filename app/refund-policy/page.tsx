import PageWrapper from "@/components/wrapper/page-wrapper";

export default function RefundPolicyPage() {
  return (
    <PageWrapper>
      <div className="flex flex-col justify-center items-center w-full p-6">
        <h1 className="text-3xl font-bold mb-4">Refund Policy</h1>
        <div className="max-w-4xl text-left">
          <p className="mb-4">
            At MCQ Lab, we strive to provide high-quality services to our users. However, we understand that there may be circumstances where you may request a refund. This Refund Policy outlines the conditions under which refunds are granted and the process for requesting a refund.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">1. Eligibility for Refunds</h2>
          <p className="mb-4">
            Refunds are only granted under the following circumstances&colon;
          </p>
          <ul className="list-disc list-inside mb-4">
            <li><strong>Service Failure</strong>&colon; If our services are not functioning as described and we are unable to resolve the issue within a reasonable time.</li>
            <li><strong>Duplicate Payment</strong>&colon; If you have been charged twice for the same service.</li>
            <li><strong>Unauthorized Payment</strong>&colon; If a payment was made without your consent.</li>
          </ul>
          <p className="mb-4">
            Refunds are not granted for&colon;
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>Change of mind or dissatisfaction with the service.</li>
            <li>Failure to use the service due to user error or technical issues on the user's side.</li>
            <li>Partial use of the service during the subscription period.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6 mb-4">2. Refund Process</h2>
          <p className="mb-4">
            To request a refund, please contact us at <a href="mailto:info@mcqlab.com" className="text-blue-500">info@mcqlab.com</a> within 14 days of the payment date. Include the following information in your request:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>Your full name and email address associated with your account.</li>
            <li>The transaction ID or payment reference number.</li>
            <li>A detailed explanation of the reason for the refund request.</li>
          </ul>
          <p className="mb-4">
            We will review your request and respond within 7 business days. If your request is approved, the refund will be processed within 14 business days and credited to your original payment method.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">3. Non-Refundable Services</h2>
          <p className="mb-4">
            The following services are non-refundable:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>Subscription fees for partially used subscription periods.</li>
            <li>Services that have been fully utilized or completed.</li>
            <li>Any promotional or discounted services.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6 mb-4">4. Chargebacks</h2>
          <p className="mb-4">
            If you initiate a chargeback without first contacting us to resolve the issue, we reserve the right to suspend or terminate your account. Additionally, you may be liable for any fees associated with the chargeback process.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">5. Changes to This Policy</h2>
          <p className="mb-4">
            We may update this Refund Policy from time to time. Any changes will be posted on this page, and your continued use of our services constitutes acceptance of the updated policy.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">6. Contact Us</h2>
          <p className="mb-4">
            If you have any questions about this Refund Policy, please contact us at <a href="mailto:info@mcqlab.com" className="text-blue-500">info@mcqlab.com</a>.
          </p>
        </div>
      </div>
    </PageWrapper>
  );
}