import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/** Same handlers as the browser, intercepting `fetch` in Vitest (see vitest.setup.ts). */
export const server = setupServer(...handlers);
