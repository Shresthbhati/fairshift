-- Supabase advisor 0011: pin the search_path of the two plain trigger functions.
alter function public.forbid_change() set search_path = public;
alter function public.shifts_guard() set search_path = public;
