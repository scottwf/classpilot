import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { attachmentBelongsToUser, getAttachmentFileInfo } from "@/src/lib/db/attachments-repository";
import { readAttachmentFile } from "@/src/lib/storage/attachment-storage";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireAuth();

  const { id } = await params;
  const db = getClassPilotDatabase();

  // The one place an attachment id alone (from a URL) grants access to
  // file content, not just JSON -- explicitly called out in issue #21's
  // security checklist. requireAuth() only confirms someone is logged in;
  // this confirms it's specifically the owner.
  if (!attachmentBelongsToUser(db, id, userId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const info = getAttachmentFileInfo(db, id);

  if (!info) {
    return new NextResponse("Not found", { status: 404 });
  }

  const contents = await readAttachmentFile(info.storedName);

  return new NextResponse(new Uint8Array(contents), {
    headers: {
      "Content-Type": info.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(info.fileName)}"`,
      "Content-Length": String(contents.byteLength),
    },
  });
}
