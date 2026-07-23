import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/webhooks/resend")({
  server: {
    handlers: {
      GET: () => Response.json(
        {
          service: "meisterme-resend-webhook",
          configured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_WEBHOOK_SECRET),
        },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      ),
      POST: async ({ request }) => {
        const { handleResendWebhook } = await import("@/lib/email-webhooks.server");
        return handleResendWebhook(request);
      },
    },
  },
});
