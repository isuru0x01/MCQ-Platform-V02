import { Button } from '@/components/ui/button';
import { Metadata } from 'next';
import Link from 'next/link';
import PageWrapper from "@/components/wrapper/page-wrapper";
import { VideoPlayer } from '@/components/video-player';

export const metadata: Metadata = {
  metadataBase: new URL("https://mcqlabs.click"),
  keywords: ['MCQ Labs', 'educational quizzes', 'AI-generated quizzes', 'learning platform'],
  title: 'About MCQ Labs',
  openGraph: {
    description: 'Learn more about MCQ Labs, the AI-powered platform for generating educational quizzes from articles and YouTube videos.',
    images: ['https://mcqlabs.click/images/about-banner.jpg']
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About MCQ Labs',
    description: 'Learn more about MCQ Labs, the AI-powered platform for generating educational quizzes from articles and YouTube videos.',
    siteId: "",
    creator: "@mcqlabs",
    creatorId: "",
    images: ['https://mcqlabs.click/images/about-banner.jpg'],
  },
};

export default async function AboutPage() {
  return (
    <PageWrapper>
      <div className='flex flex-col min-h-screen items-center mt-[2.5rem] p-3 w-full'>
        <h1 className="scroll-m-20 max-w-[600px] text-5xl font-bold tracking-tight text-center">
          About MCQ Labs
        </h1>
        <p className="mx-auto max-w-[600px] text-gray-500 md:text-lg text-center mt-2 dark:text-gray-400">
          Empowering learners with AI-generated quizzes to test and enhance their understanding of educational content.
        </p>
        <div className='flex gap-2 mt-2'>
          <Link href="/dashboard" className="mt-2">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/contact" className="mt-2">
            <Button size="lg" variant="outline">Contact Us</Button>
          </Link>
        </div>
        <div className='mb-3 mt-[1.5rem] max-w-[900px] w-full'>
          <VideoPlayer videoSrc="https://utfs.io/f/08b0a37f-afd7-4623-b5cc-e85184528fce-1f02.mp4" />
        </div>
        <div className='flex flex-col min-h-screen max-w-[900px] items-center mb-[2rem]'>
          <article className="w-full mx-auto pb-8">
            <h1 className="text-3xl lg:text-4xl font-bold mb-6">Our Mission</h1>

            <section className="mb-8">
              <p className="text-md leading-relaxed">
                At MCQ Labs, our mission is to revolutionize the way students learn by providing an innovative platform that generates quizzes from educational articles and YouTube videos. We aim to make learning more interactive, engaging, and effective.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mt-10 scroll-m-20 border-b pb-2 mb-3 text-3xl font-semibold tracking-tight transition-colors first:mt-0">How It Works</h2>
              <p className="text-md mb-5 leading-relaxed">
                MCQ Labs uses advanced AI models to analyze educational content and generate multiple-choice questions. Whether you are reading an article or watching a YouTube lecture, our platform helps you test your understanding and retain knowledge better.
              </p>
              <ol className="flex flex-col gap-1 list-decimal ml-8 mb-4">
                <li className="mb-2">
                  <strong>Submit a Resource:</strong> Paste the URL of an article or YouTube video.
                </li>
                <li className="mb-2">
                  <strong>Generate Quizzes:</strong> Our AI analyzes the content and creates 20 MCQs.
                </li>
                <li className="mb-2">
                  <strong>Test Your Knowledge:</strong> Answer the questions and track your progress.
                </li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="mt-10 scroll-m-20 border-b pb-2 mb-3 text-3xl font-semibold tracking-tight transition-colors first:mt-0">Why Choose MCQ Labs?</h2>
              <p className="text-md mb-5 leading-relaxed">
                MCQ Labs is designed to make learning more efficient and enjoyable. Here are some reasons why students and educators love our platform:
              </p>
              <ul className="flex flex-col gap-1 list-disc ml-8 mb-4">
                <li className="mb-2">
                  <strong>AI-Powered Quizzes:</strong> Automatically generate quizzes from any educational resource.
                </li>
                <li className="mb-2">
                  <strong>Track Progress:</strong> Monitor your performance and improve over time.
                </li>
                <li className="mb-2">
                  <strong>Supports Multiple Formats:</strong> Works with articles, YouTube videos, and more.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="mt-10 scroll-m-20 border-b pb-2 mb-3 text-3xl font-semibold tracking-tight transition-colors first:mt-0">Our Vision</h2>
              <p className="text-md mb-5 leading-relaxed">
                We envision a world where learning is personalized, accessible, and engaging for everyone. By leveraging AI, we aim to empower students to take control of their education and achieve their full potential.
              </p>
              <p className="text-md mb-5 leading-relaxed">
                Join us on this journey to transform education and make learning more effective and enjoyable for all.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mt-10 scroll-m-20 border-b pb-2 mb-3 text-3xl font-semibold tracking-tight transition-colors first:mt-0">Get Started Today</h2>
              <p className="text-md mb-5 leading-relaxed">
                Ready to enhance your learning experience? Sign up for MCQ Labs and start generating quizzes from your favorite educational resources today!
              </p>
              <div className='flex gap-2 mt-2'>
                <Link href="/dashboard" className="mt-2">
                  <Button size="lg">Get Started</Button>
                </Link>
                <Link href="/contact" className="mt-2">
                  <Button size="lg" variant="outline">Contact Us</Button>
                </Link>
              </div>
            </section>
          </article>
        </div>
      </div>
    </PageWrapper>
  );
}