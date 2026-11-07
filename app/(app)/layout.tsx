import Link from "next/link";
import type { ReactNode } from "react";
import { getSessionUser } from "@/lib/auth";
import { authEnabled } from "@/lib/session";
import { getNotifications } from "@/lib/notifications";
import { MobileNav, Sidebar, Topbar } from "@/components/nav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  const notifications = await getNotifications(user.id);
  const isStaff = user.isStaff || user.isSuperuser;

  return (
    <>
      <div className="sb-shell">
        <Sidebar username={user.username} isStaff={isStaff} />
        <main className="sb-main">
          <Topbar username={user.username} canLogout={authEnabled()} />
          <div className="sb-content">
            {notifications.length > 0 && (
              <div className="mb-4">
                {notifications.map((notification, index) => (
                  <div
                    key={index}
                    className={`sb-alert sb-alert-${notification.type}`}
                    role="alert"
                  >
                    <div className="d-flex align-items-center gap-2">
                      {notification.type === "danger" ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      )}
                      <span>{notification.message}</span>
                    </div>
                    <Link
                      href="/products?status=low"
                      className="sb-btn sb-btn-secondary sb-btn-sm py-1 px-2"
                      style={{ fontSize: "0.75rem" }}
                    >
                      View Items
                    </Link>
                  </div>
                ))}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </>
  );
}
