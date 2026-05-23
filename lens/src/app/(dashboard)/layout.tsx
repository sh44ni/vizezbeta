import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lens-layout">
      <Sidebar />
      <main className="lens-main lens-scrollbar">{children}</main>
    </div>
  );
}
