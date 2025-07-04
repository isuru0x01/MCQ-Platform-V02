"use client"

import ModeToggle from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { UserProfile } from '@/components/user-profile'
import config from '@/config'
import { HamburgerMenuIcon } from '@radix-ui/react-icons'
import { Banknote, Folder, HomeIcon, Settings, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import Link from 'next/link'
import { ReactNode } from 'react'

interface DashboardTopNavProps {
  children: ReactNode
  onToggleSidebar: () => void
  sidebarCollapsed: boolean
}

export default function DashboardTopNav({ children, onToggleSidebar, sidebarCollapsed }: DashboardTopNavProps) {
  return (
    <div className="flex flex-col">
      <header className="flex h-14 lg:h-[55px] items-center gap-4 border-b px-3">
        {/* Sidebar toggle button for desktop */}
        <Button
          variant="ghost"
          size="sm"
          className="hidden lg:flex h-8 w-8 p-0"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>

        {/* Mobile menu */}
        <Dialog>
          <SheetTrigger className="min-[1024px]:hidden p-2 transition">
            <HamburgerMenuIcon />
            <Link href="/dashboard">
              <span className="sr-only">Home</span>
            </Link>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <Link href="/">
                <SheetTitle>MCQ Lab</SheetTitle>
              </Link>
            </SheetHeader>
            <div className="flex flex-col space-y-3 mt-[1rem]">
              <DialogClose asChild>
                <Link href="/dashboard">
                  <Button variant="outline" className="w-full">
                    <HomeIcon className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
              </DialogClose>
              <DialogClose asChild>
                <Link href="/dashboard/resources">
                  <Button variant="outline" className="w-full">
                    <Folder className="mr-2 h-4 w-4" />
                    Resources
                  </Button>
                </Link>
              </DialogClose>
              <DialogClose asChild>
                <Link href="/dashboard/submit">
                  <Button variant="outline" className="w-full">
                    <Banknote className="mr-2 h-4 w-4" />
                    Add Resource
                  </Button>
                </Link>
              </DialogClose>
              <DialogClose asChild>
                <Link href="/dashboard/performance">
                  <Button variant="outline" className="w-full">
                    <Banknote className="mr-2 h-4 w-4" />
                    Your Performance
                  </Button>
                </Link>
              </DialogClose>
              <Separator className="my-3" />
              <DialogClose asChild>
                <Link href="/dashboard/settings">
                  <Button variant="outline" className="w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </Link>
              </DialogClose>
            </div>
          </SheetContent>
        </Dialog>

        <div className="flex justify-center items-center gap-2 ml-auto">
          {config?.auth?.enabled && <UserProfile />}
          <ModeToggle />
        </div>
      </header>
      {children}
    </div>
  );
}
