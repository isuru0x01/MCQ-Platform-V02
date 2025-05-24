"use client"
import { useForm } from 'react-hook-form';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';
import { useState } from 'react'; // Import useState for managing button text

export default function DonationPage() {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm();

    const onSubmit = async (data: any) => {
        // Handle form submission if needed
    };

    const walletAddress = "0x5fc8aa695d1bbc58b47e8a815b5d8bc10c614567";
    const [isCopied, setIsCopied] = useState(false); // State to track if the address is copied

    const handleCopyAddress = () => {
        navigator.clipboard.writeText(walletAddress).then(() => {
            setIsCopied(true); // Update state to indicate the address is copied
            setTimeout(() => setIsCopied(false), 2000); // Reset the button text after 2 seconds
        });
    };

    return (
        <div className="border-t dark:bg-black min-h-screen flex items-center justify-center">
            <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
                <div className="lg:grid lg:grid-cols-2 gap-8">
                    <div className="border-b py-8 lg:order-last lg:border-b-0 lg:border-s lg:py-16 lg:ps-16">
                        <div className="mt-8 space-y-4 lg:mt-0">
                            <div>
                                <h3 className="text-2xl font-medium">Support Us</h3>
                                <p className="mt-4 max-w-lg">
                                    Your support helps us continue our work. Scan the QR code or copy the wallet address below to make a donation.
                                </p>
                            </div>
                            <div className="flex flex-col items-center mt-6">
                                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                                    <QRCodeCanvas
                                        value={walletAddress}
                                        size={100}
                                        bgColor="transparent"
                                        fgColor="currentColor"
                                        className="text-black dark:text-white"
                                    />
                                </div>
                                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                                    Wallet Address: {walletAddress}
                                </p>
                                <Button
                                    onClick={handleCopyAddress}
                                    className="mt-4"
                                >
                                    {isCopied ? "Copied Address to Clipboard" : "Copy Address"}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="py-8 lg:py-16 lg:pe-16">
                        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
                            <div>
                                <p className="font-medium">Socials</p>
                                <ul className="mt-6 space-y-4 text-sm">
                                    <li>
                                        <Link href="https://x.com/mcqlab" target="_blank" className="transition hover:opacity-75"> Twitter </Link>
                                    </li>
                                    <li>
                                        <Link href="https://www.youtube.com/@rethinkai_lab" target="_blank" className="transition hover:opacity-75"> YouTube </Link>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <p className="font-medium">Helpful Links</p>
                                <ul className="mt-6 space-y-4 text-sm">
                                    <li>
                                        <Link target="_blank" href="/about" rel="noopener noreferrer" className="transition hover:opacity-75"> About </Link>
                                    </li>
                                    <li>
                                        <Link href="/contact" className="transition hover:opacity-75"> Contact </Link>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="mt-8 border-t pt-8">
                            <ul className="flex flex-wrap gap-4 text-xs">
                                <li>
                                    <a href="/terms" className="transition hover:opacity-75">Terms & Conditions </a>
                                </li>
                                <li>
                                    <a href="/privacy" className="transition hover:opacity-75">Privacy Policy </a>
                                </li>
                                <li>
                                    <a href="/refund-policy" className="transition hover:opacity-75">Refund Policy </a>
                                </li>
                            </ul>
                            <p className="mt-8 text-xs">&copy; 2025. Nexlution. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}