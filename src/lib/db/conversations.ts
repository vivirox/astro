import { supabase, supabaseAdmin } from "../supabase";
import type { Database } from "../../types/supabase";
import { logAuditEvent } from "../auth";

export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type NewConversation =
  Database["public"]["Tables"]["conversations"]["Insert"];
export type UpdateConversation =
  Database["public"]["Tables"]["conversations"]["Update"];

/**
 * Get all conversations for a user
 */
export async function getConversations(
  userId: string,
): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false });

  if (error) {
    console.error("Error fetching conversations:", error);
    throw new Error("Failed to fetch conversations");
  }

  return data || [];
}

/**
 * Get a single conversation by ID
 */
export async function getConversation(
  id: string,
  userId: string,
): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 is "no rows returned"
    console.error("Error fetching conversation:", error);
    throw new Error("Failed to fetch conversation");
  }

  return data;
}

/**
 * Create a new conversation
 */
export async function createConversation(
  conversation: NewConversation,
  request?: Request,
): Promise<Conversation> {
  const { data, error } = await supabase
    .from("conversations")
    .insert(conversation)
    .select()
    .single();

  if (error) {
    console.error("Error creating conversation:", error);
    throw new Error("Failed to create conversation");
  }

  // Log the event for HIPAA compliance
  await logAuditEvent(
    conversation.user_id,
    "conversation_created",
    "conversations",
    data.id,
    { title: conversation.title },
    request,
  );

  return data;
}

/**
 * Update a conversation
 */
export async function updateConversation(
  id: string,
  userId: string,
  updates: UpdateConversation,
  request?: Request,
): Promise<Conversation> {
  const { data, error } = await supabase
    .from("conversations")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating conversation:", error);
    throw new Error("Failed to update conversation");
  }

  // Log the event for HIPAA compliance
  await logAuditEvent(
    userId,
    "conversation_updated",
    "conversations",
    id,
    { updates },
    request,
  );

  return data;
}

/**
 * Delete a conversation
 */
export async function deleteConversation(
  id: string,
  userId: string,
  request?: Request,
): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting conversation:", error);
    throw new Error("Failed to delete conversation");
  }

  // Log the event for HIPAA compliance
  await logAuditEvent(
    userId,
    "conversation_deleted",
    "conversations",
    id,
    null,
    request,
  );
}

/**
 * Admin function to get all conversations (for staff/admin only)
 */
export async function adminGetAllConversations(): Promise<Conversation[]> {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all conversations:", error);
    throw new Error("Failed to fetch all conversations");
  }

  return data || [];
}
