import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/healthz")({
  server: {
    handlers: {
      GET: () => {
        const supabaseConfigured = Boolean(
          process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY,
        );

        return Response.json(
          {
            status: supabaseConfigured ? "ok" : "degraded",
            service: "meisterme-web",
            commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
          },
          {
            status: supabaseConfigured ? 200 : 503,
            headers: {
              "Cache-Control": "no-store, max-age=0",
              "X-Content-Type-Options": "nosniff",
            },
          },
        );
      },
    },
  },
});
