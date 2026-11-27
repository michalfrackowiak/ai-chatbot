import { AdminPanel } from '@/components/admin/admin-panel';

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-background p-4">
      <div className="max-w-5xl mx-auto">
        <AdminPanel />
      </div>
    </main>
  );
}