import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  notificationPanelOpen: boolean
  setSidebarCollapsed: (v: boolean) => void
  toggleSidebar: () => void
  setNotificationPanelOpen: (v: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  notificationPanelOpen: false,
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setNotificationPanelOpen: (v) => set({ notificationPanelOpen: v }),
}))
