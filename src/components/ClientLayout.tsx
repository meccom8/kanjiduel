"use client";
import { usePathname } from "next/navigation";
import DesktopNav from "./DesktopNav";

// Pages/prefixes where the sidebar should not add left padding
const NO_SIDEBAR_EXACT   = ["/landing", "/login", "/signup", "/register"];
const NO_SIDEBAR_PREFIX  = ["/duel/"];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebar =
    !NO_SIDEBAR_EXACT.includes(pathname) &&
    !NO_SIDEBAR_PREFIX.some(p => pathname.startsWith(p));

  return (
    <>
      <DesktopNav />
      <div className={showSidebar ? "lg:pl-52" : ""}>
        {children}
      </div>
    </>
  );
}
