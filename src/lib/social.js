import { supabase } from "./supabase";

// --- Favorites ---
export async function toggleFavorite(resourceId, shouldFavorite) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error("You must be logged in");

  if (shouldFavorite) {
    const { error } = await supabase.from("favorites").insert({
      user_id: userId,
      resource_id: resourceId,
    });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("resource_id", resourceId);
    if (error) throw error;
  }
}

export async function getMyFavorites(resourceIds) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return new Set();

  if (!resourceIds.length) return new Set();

  const { data, error } = await supabase
    .from("favorites")
    .select("resource_id")
    .eq("user_id", userId)
    .in("resource_id", resourceIds);

  if (error) throw error;
  return new Set((data || []).map((x) => x.resource_id));
}

// --- Votes (public only) ---
export async function setVote(resourceId, value) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error("You must be logged in");

  // upsert vote (+1 or -1)
  const { error } = await supabase.from("votes").upsert({
    user_id: userId,
    resource_id: resourceId,
    value,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function clearVote(resourceId) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error("You must be logged in");

  const { error } = await supabase
    .from("votes")
    .delete()
    .eq("user_id", userId)
    .eq("resource_id", resourceId);
  if (error) throw error;
}

export async function getMyVotes(resourceIds) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return new Map();

  if (!resourceIds.length) return new Map();

  const { data, error } = await supabase
    .from("votes")
    .select("resource_id,value")
    .eq("user_id", userId)
    .in("resource_id", resourceIds);

  if (error) throw error;

  const map = new Map();
  (data || []).forEach((x) => map.set(x.resource_id, x.value));
  return map;
}

// For "Popular": fetch vote totals (client-side aggregation for pilot)
export async function getVoteTotals(resourceIds) {
  if (!resourceIds.length) return new Map();

  const { data, error } = await supabase
    .from("votes")
    .select("resource_id,value")
    .in("resource_id", resourceIds);

  if (error) throw error;

  const totals = new Map();
  (data || []).forEach((row) => {
    totals.set(row.resource_id, (totals.get(row.resource_id) || 0) + row.value);
  });
  return totals;
}