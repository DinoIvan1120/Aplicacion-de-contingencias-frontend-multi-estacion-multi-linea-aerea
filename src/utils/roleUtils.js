export const ROL_COLORS = {
  ADMINISTRADOR: "#EA580C",
  LIDER_SAASA: "#DC2626",
  AGENTE_SAASA: "#16A34A",
  LINEA_AEREA: "#7C3AED",
  PROVEEDOR: "#0284C7",
};

export const ROL_LABELS = {
  ADMINISTRADOR: "Administrador",
  // LIDER_SAASA: 'Líder Aeroportuario',
  LIDER_SAASA: "Líder SAASA",
  AGENTE_SAASA: "Agente SAASA",
  LINEA_AEREA: "Línea Aérea",
  PROVEEDOR: "Proveedor",
};

export const ROL_ICONS = {
  ADMINISTRADOR: "Building",
  LIDER_SAASA: "Plane",
  AGENTE_SAASA: "Users",
  LINEA_AEREA: "Building2",
  PROVEEDOR: "Briefcase",
};

export function getRolColor(rol) {
  return ROL_COLORS[rol] ?? "#4F46E5";
}

export function getRolLabel(rol) {
  return ROL_LABELS[rol] ?? rol;
}

export function getRolIcon(rol) {
  return ROL_ICONS[rol] ?? "User";
}
