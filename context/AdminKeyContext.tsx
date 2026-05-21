'use client';

import React, { createContext, useContext } from 'react';

const AdminKeyContext = createContext<string>('');

export function AdminKeyProvider({ adminKey, children }: { adminKey: string; children: React.ReactNode }) {
  return (
    <AdminKeyContext.Provider value={adminKey}>
      {children}
    </AdminKeyContext.Provider>
  );
}

export function useAdminKey() {
  return useContext(AdminKeyContext);
}
