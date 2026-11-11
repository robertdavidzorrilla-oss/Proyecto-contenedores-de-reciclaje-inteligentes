import { LOCAL_CONFIG } from './config.local.js';

export const CONFIG = {
  SUPABASE: {
    URL: LOCAL_CONFIG?.SUPABASE_URL || '',
    ANON_KEY: LOCAL_CONFIG?.SUPABASE_ANON_KEY || ''
  },
  ALERT_THRESHOLD: 85,
  WASTE_TYPES: {
    PAPER: { id: 'paper', label: 'Papel', color: '#2b7fff' },
    CARDBOARD: { id: 'cardboard', label: 'Cartón', color: '#d97706' },
    PLASTIC: { id: 'plastic', label: 'Plástico', color: '#8b5cf6' }
  },
  ROLES: {
    ADMIN: 'Administrador',
    COMMON: 'Usuario Común'
  }
};

export const LOCATIONS = {
  LABS: { id: 'laboratorios', label: 'Laboratorios', station: 'Estación A - Edificio de Labs' },
  LIBRARY: { id: 'biblioteca', label: 'Biblioteca', station: 'Estación B - Planta Baja' }
};