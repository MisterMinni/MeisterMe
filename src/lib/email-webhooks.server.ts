import { Resend, type WebhookEventPayload } from "resend";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

type AdminClient = typeof supabaseAdmin;

const FINAL_EVENT_STATUSES = new Set(["processed", "ignored", "unroutable"]);
const RETRY_PROCESSING_AFTER_MS = 5 * 60 * 1000;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function emailAddress(value: string) {
  const bracketAddress = value.match(/<([^<>]+)>/u)?.[1];
  return (bracketAddress ?? value).trim().toLowerCase();
}

function normalizedAddresses(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)).map(emailAddress))];
}

function plainTextFromHtml(html: string | null | undefined) {
  if (!html) return null;
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<br\s*\/?\s*>/giu, "\n")
    .replace(/<\/p\s*>/giu, "\n\n")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;/giu, "'")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .replace(/[ \t]{2,}/gu, " ")
    .trim();
}

function safeEmailHeaders(headers: Record<string, string> | null | undefined) {
  if (!headers) return {};
  const allowed = new Set(["in-reply-to", "message-id", "references", "reply-to"]);
  return Object.fromEntries(
    Object.entries(headers).filter(([key]) => allowed.has(key.toLowerCase())),
  );
}

function eventEmailId(event: WebhookEventPayload) {
  return event.type.startsWith("email.") && "email_id" in event.data
    ? event.data.email_id
    : null;
}

async function claimEvent(
  admin: AdminClient,
  svixId: string,
  event: WebhookEventPayload,
) {
  const providerMessageId = eventEmailId(event);
  const { error: insertError } = await admin.from("email_webhook_events").insert({
    svix_id: svixId,
    event_type: event.type,
    provider_message_id: providerMessageId,
    status: "processing",
  });

  if (!insertError) return true;
  if (insertError.code !== "23505") throw insertError;

  const { data: existing, error: readError } = await admin
    .from("email_webhook_events")
    .select("status, attempts, updated_at")
    .eq("svix_id", svixId)
    .single();
  if (readError) throw readError;
  if (FINAL_EVENT_STATUSES.has(existing.status)) return false;

  const stillProcessing =
    existing.status === "processing" &&
    Date.now() - new Date(existing.updated_at).getTime() < RETRY_PROCESSING_AFTER_MS;
  if (stillProcessing) return false;

  const { error: updateError } = await admin
    .from("email_webhook_events")
    .update({
      status: "processing",
      attempts: existing.attempts + 1,
      last_error: null,
      processed_at: null,
    })
    .eq("svix_id", svixId);
  if (updateError) throw updateError;
  return true;
}

async function finishEvent(
  admin: AdminClient,
  svixId: string,
  status: "processed" | "ignored" | "unroutable",
  tenantId?: string,
  message?: string,
) {
  const { error } = await admin
    .from("email_webhook_events")
    .update({
      status,
      tenant_id: tenantId ?? null,
      last_error: message ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("svix_id", svixId);
  if (error) throw error;
}

async function failEvent(admin: AdminClient, svixId: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unbekannter Webhook-Fehler";
  await admin
    .from("email_webhook_events")
    .update({ status: "failed", last_error: message.slice(0, 1000) })
    .eq("svix_id", svixId);
}

async function processDeliveryEvent(
  admin: AdminClient,
  svixId: string,
  event: Exclude<WebhookEventPayload, { type: "email.received" }>,
) {
  const providerMessageId = eventEmailId(event);
  if (!providerMessageId) {
    await finishEvent(admin, svixId, "ignored", undefined, "Kein E-Mail-Ereignis");
    return;
  }

  let status: "scheduled" | "sent" | "delivered" | "failed" | undefined;
  let errorMessage: string | null = null;

  switch (event.type) {
    case "email.scheduled":
      status = "scheduled";
      break;
    case "email.sent":
    case "email.delivery_delayed":
      status = "sent";
      errorMessage = event.type === "email.delivery_delayed" ? "Zustellung verzögert" : null;
      break;
    case "email.delivered":
      status = "delivered";
      break;
    case "email.bounced":
      status = "failed";
      errorMessage = event.data.bounce.message;
      break;
    case "email.failed":
      status = "failed";
      errorMessage = event.data.failed.reason;
      break;
    case "email.suppressed":
      status = "failed";
      errorMessage = event.data.suppressed.message;
      break;
    case "email.complained":
      status = "failed";
      errorMessage = "Empfänger hat die E-Mail als Spam gemeldet";
      break;
    default:
      await finishEvent(admin, svixId, "ignored", undefined, "Ereignistyp wird nicht verarbeitet");
      return;
  }

  const { data, error } = await admin
    .from("communications")
    .update({ status, error_message: errorMessage })
    .eq("provider_message_id", providerMessageId)
    .select("tenant_id");
  if (error) throw error;

  if (!data.length) {
    await finishEvent(admin, svixId, "ignored", undefined, "Nachricht gehört nicht zu MeisterMe");
    return;
  }
  await finishEvent(admin, svixId, "processed", data[0].tenant_id);
}

async function processReceivedEmail(
  admin: AdminClient,
  resend: Resend,
  svixId: string,
  event: Extract<WebhookEventPayload, { type: "email.received" }>,
) {
  const { data: receivedEmail, error: retrieveError } = await resend.emails.receiving.get(
    event.data.email_id,
    { html_format: "cid" },
  );
  if (retrieveError || !receivedEmail) {
    throw new Error(retrieveError?.message ?? "Eingegangene E-Mail konnte nicht geladen werden");
  }

  const mailboxAddresses = normalizedAddresses([
    ...event.data.received_for,
    ...receivedEmail.to,
  ]);
  const { data: mailboxes, error: mailboxError } = await admin
    .from("tenant_mailboxes")
    .select("tenant_id, email_address")
    .eq("active", true)
    .in("email_address", mailboxAddresses)
    .limit(2);
  if (mailboxError) throw mailboxError;

  const tenantIds = [...new Set(mailboxes.map((mailbox) => mailbox.tenant_id))];
  if (tenantIds.length !== 1) {
    await finishEvent(
      admin,
      svixId,
      "unroutable",
      undefined,
      tenantIds.length ? "Empfänger ist mehreren Betrieben zugeordnet" : "Kein aktives Betriebspostfach gefunden",
    );
    return;
  }

  const tenantId = tenantIds[0];
  const senderEmail = emailAddress(receivedEmail.from);
  const { data: customerMatches, error: customerError } = await admin.rpc(
    "resolve_inbound_customer",
    { _tenant_id: tenantId, _email: senderEmail },
  );
  if (customerError) throw customerError;

  const customerIds = [...new Set(customerMatches.map((match) => match.customer_id))];
  const customerId = customerIds.length === 1 ? customerIds[0] : null;
  const matchError = customerIds.length > 1
    ? "Absender ist mehreren Kunden zugeordnet"
    : customerIds.length === 0
      ? "Absender ist noch keinem Kunden zugeordnet"
      : null;
  const bodyText = receivedEmail.text?.trim() || plainTextFromHtml(receivedEmail.html);
  const recipients = receivedEmail.to;
  const attachments = receivedEmail.attachments.map((attachment) => ({
    id: attachment.id,
    filename: attachment.filename,
    size: attachment.size,
    contentType: attachment.content_type,
    contentId: attachment.content_id,
    disposition: attachment.content_disposition,
  }));

  const inboundPayload = {
    tenant_id: tenantId,
    customer_id: customerId,
    provider_message_id: receivedEmail.id,
    message_id: receivedEmail.message_id,
    sender: receivedEmail.from,
    sender_email: senderEmail,
    recipients,
    cc: receivedEmail.cc ?? [],
    bcc: receivedEmail.bcc ?? [],
    subject: receivedEmail.subject,
    body_text: bodyText,
    body_html: receivedEmail.html,
    email_headers: safeEmailHeaders(receivedEmail.headers),
    attachments,
    received_at: receivedEmail.created_at,
    status: customerId ? "matched" : "unmatched",
    error_message: matchError,
  } as const;

  const { error: inboundInsertError } = await admin.from("inbound_emails").insert(inboundPayload);
  if (inboundInsertError && inboundInsertError.code !== "23505") throw inboundInsertError;

  const { data: inboundEmail, error: inboundReadError } = await admin
    .from("inbound_emails")
    .select("id, customer_id, communication_id")
    .eq("provider_message_id", receivedEmail.id)
    .single();
  if (inboundReadError) throw inboundReadError;

  if (inboundEmail.communication_id) {
    await finishEvent(admin, svixId, "processed", tenantId);
    return;
  }

  if (!customerId) {
    await finishEvent(admin, svixId, "processed", tenantId, matchError ?? undefined);
    return;
  }

  const { data: communication, error: communicationError } = await admin
    .from("communications")
    .upsert(
      {
        tenant_id: tenantId,
        customer_id: customerId,
        channel: "email",
        direction: "inbound",
        status: "received",
        subject: receivedEmail.subject,
        body: bodyText,
        sender: receivedEmail.from,
        recipients,
        attachments,
        sent_at: receivedEmail.created_at,
        provider_message_id: receivedEmail.id,
      },
      { onConflict: "provider_message_id" },
    )
    .select("id")
    .single();
  if (communicationError) throw communicationError;

  const { error: inboundUpdateError } = await admin
    .from("inbound_emails")
    .update({
      customer_id: customerId,
      communication_id: communication.id,
      status: "matched",
      error_message: null,
    })
    .eq("id", inboundEmail.id);
  if (inboundUpdateError) throw inboundUpdateError;

  await finishEvent(admin, svixId, "processed", tenantId);
}

export async function handleResendWebhook(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!apiKey || !webhookSecret) {
    return jsonResponse({ error: "E-Mail-Webhook ist noch nicht konfiguriert" }, 503);
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return jsonResponse({ error: "Webhook-Signatur fehlt" }, 400);
  }

  const payload = await request.text();
  const resend = new Resend(apiKey);
  let event: WebhookEventPayload;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
      webhookSecret,
    });
  } catch {
    return jsonResponse({ error: "Webhook-Signatur ist ungültig" }, 400);
  }

  try {
    const shouldProcess = await claimEvent(supabaseAdmin, svixId, event);
    if (!shouldProcess) return jsonResponse({ received: true, duplicate: true });

    if (event.type === "email.received") {
      await processReceivedEmail(supabaseAdmin, resend, svixId, event);
    } else {
      await processDeliveryEvent(supabaseAdmin, svixId, event);
    }
    return jsonResponse({ received: true });
  } catch (error) {
    await failEvent(supabaseAdmin, svixId, error);
    return jsonResponse({ error: "Webhook-Verarbeitung fehlgeschlagen" }, 500);
  }
}
