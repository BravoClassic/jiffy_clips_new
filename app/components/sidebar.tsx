"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Upload, User, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserButton } from "@clerk/nextjs";
import { ClerkLogo } from "./clerk-logo";

const sidebarItems = [
  { icon: Home, label: "Home", href: "/home" },
  { icon: Upload, label: "Upload", href: "/upload" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <div className="fixed left-0 top-0 bottom-0 w-16 flex flex-col items-center justify-center space-y-4 bg-black bg-opacity-50 z-50">
        {/* Logo Section */}
        <div className="mb-8">

            <ClerkLogo/>

        </div>
        {sidebarItems.map((item) => (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>
              <Link href={item.href}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`text-white hover:bg-white hover:bg-opacity-20 ${
                    pathname === item.href ? "bg-white bg-opacity-20" : ""
                  }`}
                >
                  <item.icon className="h-6 w-6" />
                  <span className="sr-only">{item.label}</span>
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        <Tooltip>
          <TooltipTrigger asChild>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  userButtonAvatarBox: "size-6",
                },
              }}
            />
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Account</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
