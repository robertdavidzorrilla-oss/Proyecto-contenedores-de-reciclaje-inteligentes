export const CONFIG = {
  SUPABASE: {
    URL: '',      
    ANON_KEY: ''  
  },
  ALERT_THRESHOLD: 85,
  WASTE_TYPES: {
    PAPER: { id: 'paper', label: 'Papel', color: '#2b7fff', bgClass: 'bg-blue-50', textClass: 'text-blue-600' },
    CARDBOARD: { id: 'cardboard', label: 'Cartón', color: '#d97706', bgClass: 'bg-amber-50', textClass: 'text-amber-700' },
    PLASTIC: { id: 'plastic', label: 'Plástico', color: '#8b5cf6', bgClass: 'bg-purple-50', textClass: 'text-purple-600' }
  },
  ROLES: {
    ADMIN: 'Administrador',
    COMMON: 'Usuario Común'
  }
};