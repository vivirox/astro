import type { APIRoute } from "astro";
import {
  getAllModels,
  getModelsByCapability,
  getModelsByProvider,
} from "../../../lib/ai/models/registry";
import { getSession } from "../../../lib/auth/session";

/**
 * API route for retrieving available AI models
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Get session and verify authentication
    const session = await getSession(request);
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get query parameters
    const provider = url.searchParams.get("provider");
    const capability = url.searchParams.get("capability");

    let models;

    // Filter models based on query parameters
    if (provider) {
      models = getModelsByProvider(provider as any);
    } else if (capability) {
      models = getModelsByCapability(capability as any);
    } else {
      models = getAllModels();
    }

    // Return JSON response
    return new Response(JSON.stringify({ models }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error retrieving AI models:", error);

    // Return error response
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred while retrieving AI models",
      }),
      {
        status: error.status || 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
