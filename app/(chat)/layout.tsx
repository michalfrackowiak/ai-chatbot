import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { auth } from '../(auth)/auth';
import Script from 'next/script';
import { LedgerWorkspace } from '@/components/ledger-panel';
import { isUsageAdmin } from '@/lib/ai/usage-admin';

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <SidebarProvider defaultOpen={!isCollapsed}>
        <AppSidebar user={session?.user} />
        <SidebarInset>
          {session?.user ? (
            <LedgerWorkspace
              key={session.user.id}
              userId={session.user.id}
              admin={isUsageAdmin(session.user)}
            >
              {children}
            </LedgerWorkspace>
          ) : (
            children
          )}
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
