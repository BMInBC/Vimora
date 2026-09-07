"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/firebase/authContext";
import Sidebar from "@/components/Sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Restore user's collapse preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vimora_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("vimora_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // 1. Landing page ("/") should NEVER show the sidebar
  const isLandingPage = pathname === "/";

  // 2. Authentication pages (login, signup, forgot-password) stay standalone
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password";

  // 3. Only show sidebar after logging in or signing up (authenticated user) and not on landing or auth pages
  const shouldShowSidebar = !isLandingPage && !isAuthPage && !!user;

  if (!shouldShowSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-slate-50/50">
      {/* Left side navigation bar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? "md:pl-[72px]" : "md:pl-64"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
