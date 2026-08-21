"use server";

import { redirect } from "next/navigation";
import type { AttachmentOwner } from "@/src/lib/db/attachments-repository";
import {
  createFileAttachment,
  createLinkAttachment,
  deleteAttachment,
} from "@/src/lib/db/attachments-repository";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import {
  deleteAttachmentFile,
  generateStoredName,
  isAllowedAttachmentFile,
  maxAttachmentSizeBytes,
  saveAttachmentFile,
} from "@/src/lib/storage/attachment-storage";

function readOwner(formData: FormData): { owner: AttachmentOwner; redirectPath: string } {
  const ownerType = String(formData.get("ownerType") ?? "");
  const ownerId = String(formData.get("ownerId") ?? "");

  if (ownerType === "unit") {
    return { owner: { unitId: ownerId }, redirectPath: `/units/${ownerId}` };
  }

  return { owner: { lessonId: ownerId }, redirectPath: `/lessons/${ownerId}` };
}

export async function createLinkAttachmentAction(formData: FormData) {
  const userId = await requireAuth();

  const { owner, redirectPath } = readOwner(formData);
  const label = String(formData.get("label") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();

  if (!label || !/^https?:\/\/\S+$/i.test(url)) {
    redirect(`${redirectPath}?attachmentError=link`);
  }

  createLinkAttachment(getClassPilotDatabase(), userId, owner, { label, url });

  redirect(redirectPath);
}

export async function createFileAttachmentAction(formData: FormData) {
  const userId = await requireAuth();

  const { owner, redirectPath } = readOwner(formData);
  const label = String(formData.get("label") ?? "").trim();
  const file = formData.get("file");

  if (!label || !(file instanceof File) || file.size === 0) {
    redirect(`${redirectPath}?attachmentError=file`);
  }

  if (!isAllowedAttachmentFile(file.name)) {
    redirect(`${redirectPath}?attachmentError=filetype`);
  }

  if (file.size > maxAttachmentSizeBytes) {
    redirect(`${redirectPath}?attachmentError=filesize`);
  }

  const storedName = generateStoredName(file.name);
  const contents = Buffer.from(await file.arrayBuffer());
  await saveAttachmentFile(storedName, contents);

  createFileAttachment(getClassPilotDatabase(), userId, owner, {
    label,
    fileName: file.name,
    storedName,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  });

  redirect(redirectPath);
}

export async function deleteAttachmentAction(formData: FormData) {
  const userId = await requireAuth();

  const { redirectPath } = readOwner(formData);
  const attachmentId = String(formData.get("attachmentId") ?? "");
  const storedName = deleteAttachment(getClassPilotDatabase(), userId, attachmentId);

  if (storedName) {
    await deleteAttachmentFile(storedName);
  }

  redirect(redirectPath);
}
