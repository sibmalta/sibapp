/**
 * Persists user activity (views, etc.) to the Supabase user_activity table.
 * Fire-and-forget — errors are logged but never block the UI.
 */

export async function logActivity(supabaseClient, { userId, itemId, action = 'view' }) {
  if (!supabaseClient || !userId || !itemId) return

  try {
    const { error } = await supabaseClient
      .from('user_activity')
      .insert({ user_id: userId, item_id: String(itemId), action })

    if (error) {
      console.error('[activityTracker] insert failed:', error.message)
    }
  } catch (err) {
    console.error('[activityTracker] unexpected error:', err)
  }
}
