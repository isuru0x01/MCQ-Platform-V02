import { ArrowRight, Github } from 'lucide-react';
import Link from "next/link";
import { BorderBeam } from "../magicui/border-beam";
import { Button } from "../ui/button";
import Image from 'next/image';
import { TITLE_TAILWIND_CLASS } from '@/utils/constants';

export default function HeroSection() {
    return (
        <section className='flex flex-col items-center justify-center leading-6 mt-[3rem]' aria-label="Nextjs Starter Kit Hero">
            <h1 className={`${TITLE_TAILWIND_CLASS} scroll-m-20 font-semibold tracking-tight text-center max-w-[1120px] bg-gradient-to-b dark:text-white`}>
                📚 Level Up Your Learning with Tutorials & Quizzes! 🤖✨
            </h1>
            <p className="mx-auto max-w-[700px] text-gray-500 text-center mt-2 dark:text-gray-400">
                📝 Submit educational articles or 🎥 YouTube lectures, and our platform generates tutorials and 🧠 MCQ questions to test your understanding. 📊 Track your progress and 📈 reinforce your knowledge effectively! 🚀
            </p>
            {/* <div className="flex justify-center items-center gap-3">
                <Link href="/dashboard" className="mt-5">
                    <Button className="animate-buttonheartbeat rounded-md bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white">
                        Get Started
                    </Button>
                </Link>

                <Link
                    href="https://x.com/mcqlabs"
                    target='_blank'
                    className="mt-5"
                    aria-label="Join Conversation (opens in a new tab)"
                >
                    <Button variant="outline" className="flex gap-1">
                        Join Conversation
                        <ArrowRight className='w-4 h-4' aria-hidden="true" />
                    </Button>
                </Link>
                
            </div> */}
        </section>
    )
}
