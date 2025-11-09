import type { Metadata } from "next";

import { CopilotKit } from "@copilotkit/react-core";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import "@copilotkit/react-ui/styles.css";

export const metadata: Metadata = {
  title: "Simplaix CRM",
  description: "Agentic CRM system that manages contacts, tasks, and deals for your business.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-white text-neutral-900" suppressHydrationWarning>
        <CopilotKit runtimeUrl="/api/copilotkit">
          {children}
        </CopilotKit>
        <Toaster />
      </body>
    </html>
  );
}
