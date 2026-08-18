-- Remove get_user_pedagogical_memory / save_user_pedagogical_memory.
--
-- Context: these were introduced in 20260806205501_update_mat_functions.sql
-- with a broken dollar-quote (opened with $$, closed with $;), so the
-- migration likely failed to create them. Even if fixed, both are
-- SECURITY DEFINER, accept an arbitrary p_user_id parameter, and are
-- GRANTed to the "authenticated" role without checking auth.uid() = p_user_id
-- -- meaning any logged-in user could read or write another user's
-- pedagogical memory via a direct RPC call, bypassing the RLS policies
-- already in place on public.user_pedagogical_memory.
--
-- They are unused: mat-chat (supabase/functions/mat-chat/index.ts) reads
-- and writes public.user_pedagogical_memory directly, correctly scoped by
-- the caller's own userId, and no other code references these RPCs.
--
-- Dropping them removes the dead/broken code and closes the theoretical
-- IDOR before it's ever "fixed" into an exploitable state. RLS on
-- user_pedagogical_memory itself is correct and untouched.

drop function if exists public.get_user_pedagogical_memory(uuid);
drop function if exists public.save_user_pedagogical_memory(uuid, text);