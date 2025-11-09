import { create } from 'zustand'

interface ActivityAction {
  activityId: string
  action: 'accept' | 'reject'
  timestamp: number
}

interface ActivityActionsState {
  pendingAction: ActivityAction | null
  isProcessing: boolean
  triggerAccept: (activityId: string) => void
  triggerReject: (activityId: string) => void
  clearPendingAction: () => void
  setIsProcessing: (isProcessing: boolean) => void
}

export const useActivityActionsStore = create<ActivityActionsState>((set) => ({
  pendingAction: null,
  isProcessing: false,
  
  triggerAccept: (activityId: string) => 
    set({ 
      pendingAction: { 
        activityId, 
        action: 'accept', 
        timestamp: Date.now() 
      },
      isProcessing: true 
    }),
  
  triggerReject: (activityId: string) => 
    set({ 
      pendingAction: { 
        activityId, 
        action: 'reject', 
        timestamp: Date.now() 
      },
      isProcessing: true 
    }),
  
  clearPendingAction: () => 
    set({ 
      pendingAction: null, 
      isProcessing: false 
    }),
  
  setIsProcessing: (isProcessing: boolean) => 
    set({ isProcessing }),
}))

