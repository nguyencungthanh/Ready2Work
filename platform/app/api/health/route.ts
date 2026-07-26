import { withApiHandler } from "@/lib/api/handler";

export const GET = withApiHandler(async () => {
  return { status: "ok" };
});
