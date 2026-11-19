import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-white p-0">
      <div className="app-frame flex h-screen w-full max-w-none overflow-hidden rounded-none bg-white shadow-none">
        <Sidebar isMobileOpen={isMobileOpen} onCloseMobile={() => setIsMobileOpen(false)} />

        <div className="app-workspace flex min-h-0 min-w-0 flex-1 flex-col bg-white">
          <Header onOpenMobile={() => setIsMobileOpen(true)} />

          <main className="min-h-0 flex-1 overflow-y-auto bg-[#f7f8fa] p-4 sm:p-6 lg:p-7">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
