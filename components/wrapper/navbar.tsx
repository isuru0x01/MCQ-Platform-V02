"use client";
import Link from 'next/link';
import * as React from "react";
import { GiHamburgerMenu } from "react-icons/gi";
import { Button } from "../ui/button";
import { SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { UserProfile } from "../user-profile";
import ModeToggle from "../mode-toggle";
import { BlocksIcon } from "lucide-react";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import config from "@/config";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/nextjs";
import { Dialog, DialogClose } from "@radix-ui/react-dialog";

const components: { title: string; href: string; description: string }[] = [
    {
        title: "Marketing Page",
        href: "/marketing-page",
        description: "Write some wavy here to get them to click.",
    },
];

export default function NavBar() {
    let userId = null;
    /* eslint-disable react-hooks/rules-of-hooks */
    if (config?.auth?.enabled) {
        const user = useAuth();
        userId = user?.userId;
    }

    return (
        <div className="flex min-w-full fixed justify-between p-2 border-b z-10 dark:bg-black dark:bg-opacity-50 bg-white">
            <div className="flex justify-between w-full min-[825px]:hidden">
                <Dialog>
                    <SheetTrigger className="p-2 transition">
                        <Button size="icon" variant="ghost" className="w-4 h-4" aria-label="Open menu" asChild>
                            <GiHamburgerMenu />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left">
                        <SheetHeader>
                            <SheetTitle>MCQ Lab</SheetTitle>
                        </SheetHeader>
                        <div className="flex flex-col space-y-3 mt-[1rem]">
                            <DialogClose asChild>
                                <Link href="/">
                                    <Button variant="outline" className="w-full">Home</Button>
                                </Link>
                            </DialogClose>
                            <DialogClose asChild>
                                <Link href="/about">
                                    <Button variant="outline" className="w-full">About</Button>
                                </Link>
                            </DialogClose>
                            <DialogClose asChild>
                                <Link href="/contact">
                                    <Button variant="outline" className="w-full">Contact</Button>
                                </Link>
                            </DialogClose>
                            <DialogClose asChild>
                                <Link href="/dashboard">
                                    <Button variant="outline" className="w-full">Dashboard</Button>
                                </Link>
                            </DialogClose>
                        </div>
                    </SheetContent>
                </Dialog>
                <ModeToggle />
            </div>
            <NavigationMenu>
                <NavigationMenuList className="max-[825px]:hidden flex gap-3 w-[100%] justify-between">
                    <Link
                        href="/"
                        className="pl-2 pr-2 flex items-center"
                        aria-label="Home">
                        <BlocksIcon aria-hidden="true" />
                        <span className="font-bold ml-2">MCQ Lab</span>
                    </Link>
                </NavigationMenuList>
                <NavigationMenuList>
                    <NavigationMenuItem className="max-[825px]:hidden">
                        <Link href="/dashboard" passHref>
                            <Button variant="ghost">
                                Dashboard
                            </Button>
                        </Link>
                    </NavigationMenuItem>
                    <NavigationMenuItem className="max-[825px]:hidden">
                        <Link href="/about" passHref>
                            <Button variant="ghost">
                                About
                            </Button>
                        </Link>
                    </NavigationMenuItem>
                    <NavigationMenuItem className="max-[825px]:hidden">
                        <Link href="/contact" passHref>
                            <Button variant="ghost">
                                Contact
                            </Button>
                        </Link>
                    </NavigationMenuItem>
                    
                </NavigationMenuList>
            </NavigationMenu>
            <div className="flex items-center gap-2 max-[825px]:hidden">
                {userId && <UserProfile />}
                <ModeToggle />
            </div>
        </div>
    );
}

const ListItem = React.forwardRef<
    React.ElementRef<"a">,
    React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
    return (
        <li>
            <NavigationMenuLink asChild>
                <a
                    ref={ref}
                    className={cn(
                        "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                        className
                    )}
                    {...props}
                >
                    <div className="text-sm font-medium leading-none">{title}</div>
                    <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        {children}
                    </p>
                </a>
            </NavigationMenuLink>
        </li>
    );
});
ListItem.displayName = "ListItem";