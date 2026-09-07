export const ROLES = {
  ADMINISTRADOR: "ADMINISTRADOR",
  LIDER_SAASA: "LIDER_SAASA",
  AGENTE_SAASA: "AGENTE_SAASA",
  LINEA_AEREA: "LINEA_AEREA",
  PROVEEDOR: "PROVEEDOR",
};

export const TIPOS_CONTINGENCIA = [
  { value: "CANCELACION", label: "Cancelación" },
  { value: "DEMORA", label: "Demora" },
  { value: "REPROGRAMADO", label: "Reprogramado" },
  { value: "PROGRAMADO", label: "Programado" },
];

export const TIPOS_PROVEEDOR = [
  { value: "HOTEL", label: "Hotel" },
  { value: "TRANSPORTE", label: "Transporte" },
  { value: "RESTAURANTE", label: "Restaurante" },
];

export const TIPOS_HABITACION = [
  { value: "HABITACION_SIMPLE", label: "Simple" },
  { value: "HABITACION_DOBLE", label: "Doble" },
  { value: "HABITACION_MATRIMONIAL", label: "Matrimonial" },
];

export const TIPOS_SERVICIO = {
  HOTEL: [
    { value: "HOTEL_DESAYUNO", label: "Desayuno" },
    { value: "HOTEL_ALMUERZO", label: "Almuerzo" },
    { value: "HOTEL_SNACK", label: "Snack" },
    { value: "HOTEL_CENA", label: "Cena" },
  ],
  TRANSPORTE: [
    { value: "TRANSPORTE_INDIVIDUAL", label: "Aeropuerto - Domicilio" },
    { value: "TRANSPORTE_GRUPAL", label: "Domicilio - Aeropuerto" },
  ],
  RESTAURANTE: [
    { value: "RESTAURANTE_DESAYUNO", label: "Desayuno" },
    { value: "RESTAURANTE_ALMUERZO", label: "Almuerzo" },
    { value: "RESTAURANTE_CENA", label: "Cena" },
  ],
};

export const REDIRECT_POR_ROL = {
  ADMINISTRADOR: "/admin",
  LIDER_SAASA: "/lider/vuelo",
  AGENTE_SAASA: "/agente/atencion",
  LINEA_AEREA: "/reportes",
  PROVEEDOR: "/reportes",
};
