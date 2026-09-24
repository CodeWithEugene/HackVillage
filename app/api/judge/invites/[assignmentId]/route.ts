import { NextResponse } from "next/server";

import { respondToJudgeInviteAction } from "@/services/judging/actions";

/** Plain-form judge invite responses (no client JS required — P6). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const { assignmentId } = await params;
  const form = await request.formData();
  const decision = String(form.get("decision") ?? "");
  if (decision !== "accept" && decision !== "decline") {
    return NextResponse.redirect(new URL("/judge", request.url), 303);
  }
  await respondToJudgeInviteAction(assignmentId, decision === "accept");
  return NextResponse.redirect(new URL("/judge", request.url), 303);
}
