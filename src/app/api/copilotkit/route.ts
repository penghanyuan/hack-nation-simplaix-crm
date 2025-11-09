import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
  AnthropicAdapter
} from "@copilotkit/runtime";
import { NextRequest } from "next/server";
 
// 1. Create the Anthropic adapter with proper configuration
const serviceAdapter = new AnthropicAdapter({
  model: "claude-sonnet-4-20250514",
});
 
// 2. Create the CopilotRuntime instance
const runtime = new CopilotRuntime({
  // Add any backend actions here if needed
});
 
// 3. Build a Next.js API route that handles the CopilotKit runtime requests.
export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime, 
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });
 
  return handleRequest(req);
};