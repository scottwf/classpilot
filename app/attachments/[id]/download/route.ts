import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { getAttachmentFileInfo } from "@/src/lib/db/attachments-repository";
import { readAttachmentFile } from "@/src/lib/storage/attachment-storage";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();

  const { id } = await params;
  const info = getAttachmentFileInfo(getClassPilotDatabase(), id);

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
