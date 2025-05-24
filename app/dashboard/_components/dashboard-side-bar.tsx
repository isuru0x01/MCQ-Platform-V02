'use client'

import { Separator } from '@/components/ui/separator'
import clsx from 'clsx'
import {
  Banknote,
  Folder,
  HomeIcon,
  Settings
} from "lucide-react"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaTasks } from 'react-icons/fa'

interface DashboardSideBarProps {
  collapsed: boolean
}

export default function DashboardSideBar({ collapsed }: DashboardSideBarProps) {
  const pathname = usePathname();

  return (
    <div className="lg:block hidden border-r h-full transition-all duration-300">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-[55px] items-center justify-between border-b px-3 w-full">
          <Link
            className="flex items-center gap-2 font-semibold ml-1"
            href="/">
            <span className={`transition-all duration-300 ${
              collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            }`}>MCQ Lab</span>
            {collapsed && (
              <span className="text-xl font-bold">M</span>
            )}
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-4 text-sm font-medium">
            <Link
              className={clsx("flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50", {
                "flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-gray-900 transition-all hover:text-gray-900 dark:bg-gray-800 dark:text-gray-50 dark:hover:text-gray-50": pathname === "/dashboard"
              })}
              href="/dashboard"
              title={collapsed ? "Home" : ""}>
              <div className="border rounded-lg dark:bg-black dark:border-gray-800 border-gray-400 p-1 bg-white flex-shrink-0">
                <HomeIcon className="h-3 w-3" />
              </div>
              <span className={`transition-all duration-300 ${
                collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}>Home</span>
            </Link>
            <Link
              className={clsx("flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50", {
                "flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-gray-900 transition-all hover:text-gray-900 dark:bg-gray-800 dark:text-gray-50 dark:hover:text-gray-50": pathname === "/dashboard/projects"
              })}
              href="/dashboard/resources"
              title={collapsed ? "Resources" : ""}>
              <div className="border rounded-lg dark:bg-black dark:border-gray-800 border-gray-400 p-1 bg-white flex-shrink-0">
                <Folder className="h-3 w-3" />
              </div>
              <span className={`transition-all duration-300 ${
                collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}>Resources</span>
            </Link>
            <Link
              className={clsx("flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50", {
                "flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-gray-900 transition-all hover:text-gray-900 dark:bg-gray-800 dark:text-gray-50 dark:hover:text-gray-50": pathname === "/dashboard/submit"
              })}
              href="/dashboard/submit"
              title={collapsed ? "Add Resource" : ""}>
              <div className="border rounded-lg dark:bg-black dark:border-gray-800 border-gray-400 p-1 bg-white flex-shrink-0">
                <Banknote className="h-3 w-3" />
              </div>
              <span className={`transition-all duration-300 ${
                collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}>Add Resource</span>
            </Link>
            <Link
              className={clsx("flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50", {
                "flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-gray-900 transition-all hover:text-gray-900 dark:bg-gray-800 dark:text-gray-50 dark:hover:text-gray-50": pathname === "/dashboard/performance"
              })}
              href="/dashboard/performance"
              title={collapsed ? "Your Performance" : ""}>
              <div className="border rounded-lg dark:bg-black dark:border-gray-800 border-gray-400 p-1 bg-white flex-shrink-0">
                <Banknote className="h-3 w-3" />
              </div>
              <span className={`transition-all duration-300 ${
                collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}>Your Performance</span>
            </Link>
            <Separator className={`my-3 transition-all duration-300 ${
              collapsed ? 'mx-2' : ''
            }`} />
            <Link
              className={clsx("flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50", {
                "flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-gray-900 transition-all hover:text-gray-900 dark:bg-gray-800 dark:text-gray-50 dark:hover:text-gray-50": pathname === "/dashboard/settings"
              })}
              href="/dashboard/settings"
              id="onboarding"
              title={collapsed ? "Settings" : ""}>
              <div className="border rounded-lg dark:bg-black dark:border-gray-800 border-gray-400 p-1 bg-white flex-shrink-0">
                <Settings className="h-3 w-3" />
              </div>
              <span className={`transition-all duration-300 ${
                collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}>Settings</span>
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
