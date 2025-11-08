"use client";

import { CopilotSidebar } from "@copilotkit/react-ui";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ActivityQueue } from "@/components/activity-queue";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-auto bg-white">
          <CopilotSidebar
            disableSystemMessage={true}
            clickOutsideToClose={false}
            labels={{
              title: "Popup Assistant",
              initial: "👋 Hi, there! You're chatting with an agent.",
            }}
            suggestions={[
              {
                title: "Generative UI",
                message: "Get the weather in San Francisco.",
              },
              {
                title: "Frontend Tools",
                message: "Set the theme to green.",
              },
              {
                title: "Human In the Loop",
                message: "Please go to the moon.",
              },
              {
                title: "Write Agent State",
                message: "Add a proverb about AI.",
              },
              {
                title: "Update Agent State",
                message:
                  "Please remove 1 random proverb from the list if there are any.",
              },
              {
                title: "Read Agent State",
                message: "What are the proverbs?",
              },
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
