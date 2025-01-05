import { Metadata } from 'next';
import PageWrapper from "@/components/wrapper/page-wrapper";

export const metadata: Metadata = {
  metadataBase: new URL("https://mcqlabs.click"),
  keywords: ['MCQ Labs', 'contact', 'support', 'educational quizzes'],
  title: 'Contact MCQ Labs',
  openGraph: {
    description: 'Get in touch with MCQ Labs for support, inquiries, or feedback. We are here to help!',
    images: ['https://mcqlabs.xyz/images/contact-banner.jpg']
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact MCQ Labs',
    description: 'Get in touch with MCQ Labs for support, inquiries, or feedback. We are here to help!',
    siteId: "",
    creator: "@mcqlabs",
    creatorId: "",
    images: ['https://mcqlabs.xyz/images/contact-banner.jpg'],
  },
};

export default function ContactPage() {
  return (
    <PageWrapper>
      <div className='flex flex-col min-h-screen items-center mt-[2.5rem] p-3 w-full'>
        <h1 className="scroll-m-20 max-w-[600px] text-5xl font-bold tracking-tight text-center">
          Contact Us
        </h1>
        <p className="mx-auto max-w-[600px] text-gray-500 md:text-lg text-center mt-2 dark:text-gray-400">
          Have questions, feedback, or need support? We are here to help! Reach out to us via email or Twitter.
        </p>

        <div className="mt-[1.5rem] w-full max-w-[600px] bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md">
          <div className="text-center">
            <p className="text-lg font-semibold">Email:</p>
            <a href="mailto:info@mcqlabs.click" className="text-blue-500 hover:text-blue-700">
              support@mcqlabs.xyz
            </a>
          </div>

          <div className="text-center mt-4">
            <p className="text-lg font-semibold">Twitter:</p>
            <a href="https://twitter.com/mcqlabs" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
              @mcqlabs
            </a>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}