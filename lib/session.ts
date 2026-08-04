import "server-only";

import type { NextRequest } from "next/server";
import { auth } from "./auth";

export async function sessionForRequest(request: NextRequest) {
  return auth.api.getSession({ headers: request.headers });
}
