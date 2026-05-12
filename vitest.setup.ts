import { beforeEach } from "vitest";
import { cache } from "@/lib/cache";
import { clearDedup } from "@/lib/dedup";

beforeEach(async () => {
  await cache.clear();
  clearDedup();
});
