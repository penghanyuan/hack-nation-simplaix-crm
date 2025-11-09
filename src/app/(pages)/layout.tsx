"use client";

import { CopilotSidebar, useCopilotChatSuggestions } from "@copilotkit/react-ui";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ActivityQueue } from "@/components/activity-queue";
import { useActivityQueueTool } from "@/hooks/use-activity-queue-tool";
import { useActivityActionsTool } from "@/hooks/use-activity-actions-tool";
import { useNavigationTool } from "@/hooks/use-navigation-tool";
import { useTasksData } from "@/hooks/use-tasks-data";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Register the frontend tools
  useActivityQueueTool();
  useActivityActionsTool();
  useNavigationTool();
  
  // Make tasks data available to the AI
  useTasksData();
  useCopilotChatSuggestions(
    {
      instructions: "Suggest the most relevant next actions.",
      minSuggestions: 1,
      maxSuggestions: 2,
    }
  );
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-auto bg-white">
          <CopilotSidebar
            clickOutsideToClose={false}
            defaultOpen={false}
            instructions="You are a helpful CRM assistant. You can help users manage their contacts, tasks, and activities. You have access to: 1) All tasks in the system - you can answer questions about task status, priorities, deadlines, and provide summaries, 2) Tools to update the activity queue to sync new emails and transcripts, 3) Tools to accept or reject specific activities from the queue, 4) Tools to manage email sync settings, 5) Tools to navigate between pages. When accepting or rejecting activities, you need to use the activity ID from the queue."
            labels={{
              title: "CRM Assistant",
              initial: "👋 Hi! I can help you manage your CRM. I can update activities, sync emails, and more. What would you like to do?",
            }}
            suggestions={[
              {
                title: "Get latest activities",
                message: "Update the activity queue with the latest activities.",
              },
              {
                title: "Adjust email sync",
                message: "Change email sync hours to last 24 hours.",
              },
              {
                title: "Check duplicated activities",
                message: "Check for duplicated activities in the activity queue with the contacts and tasks in the CRM.",
              },
              {
                title: "High priority tasks",
              message: "What tasks do I have with high priority?",
              }
            ]}
          >
            {children}
          </CopilotSidebar>
        </div>
        <ActivityQueue />
      </SidebarInset>
    </SidebarProvider>
  );
}
