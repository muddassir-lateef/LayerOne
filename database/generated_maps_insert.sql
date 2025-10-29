-- Generated SQL for AoE2 Map Pool
-- Generated on: 2025-10-29 11:44:58
-- Total maps: 21

INSERT INTO public.maps (name, description, image_url, display_order) VALUES
  ('Acropolis', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_acropolis.png', 1),
  ('African Clearing', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_african_clearing.png', 2),
  ('Arabia', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_arabia.png', 3),
  ('Arena', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_arena.png', 4),
  ('Atacama', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_atacama.png', 5),
  ('Baltic', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_baltic.png', 6),
  ('Black-forest', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_black-forest.png', 7),
  ('Chaos Pit', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_chaos_pit.png', 8),
  ('Enclosed', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_enclosed.png', 9),
  ('Fortress', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_fortress.png', 10),
  ('Four-lakes', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_four-lakes.png', 11),
  ('Glade', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_glade.png', 12),
  ('Haboob', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_haboob.png', 13),
  ('Hideout', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_hideout.png', 14),
  ('Land Nomad', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_land_nomad.png', 15),
  ('Nomad', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_nomad.png', 16),
  ('Prairie', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_prairie.png', 17),
  ('Runestones', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_runestones.png', 18),
  ('Socotra', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_socotra.png', 19),
  ('Steppe', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_steppe.png', 20),
  ('Team-islands', 'To be decided', 'https://jcpkansfiogtpppvkpjs.supabase.co/storage/v1/object/public/map-images/rm_team-islands.png', 21)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

