import { CONFIG } from '../config.js';

// Inicializar cliente oficial de Supabase
export const supabase = window.supabase.createClient(
  CONFIG.SUPABASE.URL,
  CONFIG.SUPABASE.ANON_KEY );