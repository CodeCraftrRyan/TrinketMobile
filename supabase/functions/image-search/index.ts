// Temporary short-circuit: respond immediately for debugging (useful to verify gateway->runtime)
// Replace the full implementation with a tiny Deno.serve that logs and returns quickly.
// NOTE: Keep this file minimal and do NOT include service keys here.

Deno.serve((_req) => {
  console.log("image-search: request received");
  return new Response(JSON.stringify({ ok: true, step: "hit" }), {
    headers: { "Content-Type": "application/json" },
  });
});
