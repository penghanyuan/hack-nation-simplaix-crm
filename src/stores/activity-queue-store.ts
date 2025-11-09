import { create } from 'zustand'

interface ActivityQueueState {
  isUpdating: boolean
  triggerUpdate: () => void
  setIsUpdating: (isUpdating: boolean) => void
}

export const useActivityQueueStore = create<ActivityQueueState>((set) => ({
  isUpdating: false,
  triggerUpdate: () => {
    // This will be called by the frontend tool
    // The actual update logic is in the ActivityQueue component
    set({ isUpdating: true })
  },
  setIsUpdating: (isUpdating: boolean) => set({ isUpdating }),
}))

