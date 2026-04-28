import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/clerk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Clerk webhook handler - for future use
    return new Response("OK", { status: 200 });
  }),
});

export default http;
