// Provincias y ciudades principales de Argentina
const PROVINCIAS_CIUDADES = {
  'Buenos Aires': [
    'La Plata', 'Mar del Plata', 'Quilmes', 'Lanús', 'General San Martín',
    'Lomas de Zamora', 'Almirante Brown', 'Moreno', 'Tigre', 'Florencio Varela',
    'Berazategui', 'Esteban Echeverría', 'Merlo', 'Morón', 'Tres de Febrero',
    'San Isidro', 'Vicente López', 'Pilar', 'Bahía Blanca', 'Tandil',
    'Pergamino', 'Olavarría', 'Necochea', 'Junín', 'San Nicolás de los Arroyos',
    'Zárate', 'Campana', 'Luján', 'Mercedes', 'Azul',
  ],
  'Ciudad Autónoma de Buenos Aires': [
    'Buenos Aires (CABA)',
  ],
  'Catamarca': [
    'San Fernando del Valle de Catamarca', 'Tinogasta', 'Santa María',
    'Andalgalá', 'Belén', 'Frías',
  ],
  'Chaco': [
    'Resistencia', 'Presidencia Roque Sáenz Peña', 'Villa Ángela',
    'Charata', 'Barranqueras', 'Fontana',
  ],
  'Chubut': [
    'Rawson', 'Comodoro Rivadavia', 'Trelew', 'Puerto Madryn',
    'Esquel', 'Rada Tilly',
  ],
  'Córdoba': [
    'Córdoba', 'Villa Carlos Paz', 'Río Cuarto', 'Alta Gracia',
    'Villa María', 'San Francisco', 'Cosquín', 'Jesús María',
    'Bell Ville', 'Laboulaye', 'Marcos Juárez', 'La Calera',
  ],
  'Corrientes': [
    'Corrientes', 'Goya', 'Mercedes', 'Curuzú Cuatiá',
    'Paso de los Libres', 'Saladas',
  ],
  'Entre Ríos': [
    'Paraná', 'Concordia', 'Gualeguaychú', 'Gualeguay',
    'Villaguay', 'Colón', 'Concepción del Uruguay',
  ],
  'Formosa': [
    'Formosa', 'Clorinda', 'Pirané', 'El Colorado',
  ],
  'Jujuy': [
    'San Salvador de Jujuy', 'Palpalá', 'San Pedro de Jujuy',
    'Libertador General San Martín', 'Perico',
  ],
  'La Pampa': [
    'Santa Rosa', 'General Pico', 'Toay', 'Realicó',
    'General Acha', 'Victorica',
  ],
  'La Rioja': [
    'La Rioja', 'Chilecito', 'Aimogasta', 'Chamical',
  ],
  'Mendoza': [
    'Mendoza', 'San Rafael', 'Godoy Cruz', 'Maipú',
    'Luján de Cuyo', 'Las Heras', 'Guaymallén', 'Rivadavia',
    'General Alvear', 'Malargüe',
  ],
  'Misiones': [
    'Posadas', 'Oberá', 'Eldorado', 'Apóstoles',
    'Puerto Iguazú', 'Leandro N. Alem', 'Jardín América',
  ],
  'Neuquén': [
    'Neuquén', 'San Martín de los Andes', 'Zapala',
    'Cutral Có', 'Plaza Huincul', 'Centenario', 'Chos Malal',
  ],
  'Río Negro': [
    'Viedma', 'Bariloche', 'Cipolletti', 'General Roca',
    'Allen', 'Catriel', 'El Bolsón',
  ],
  'Salta': [
    'Salta', 'San Ramón de la Nueva Orán', 'Tartagal',
    'Rosario de la Frontera', 'Metán', 'Cafayate',
  ],
  'San Juan': [
    'San Juan', 'Rivadavia', 'Caucete', 'Santa Lucía',
    'Pocito', 'Chimbas', 'Rawson',
  ],
  'San Luis': [
    'San Luis', 'Villa Mercedes', 'Merlo', 'Justo Daract',
    'Quines', 'La Toma',
  ],
  'Santa Cruz': [
    'Río Gallegos', 'Caleta Olivia', 'Pico Truncado',
    'Puerto Deseado', 'El Calafate', 'Las Heras',
  ],
  'Santa Fe': [
    'Santa Fe', 'Rosario', 'Rafaela', 'Venado Tuerto',
    'Reconquista', 'Santo Tomé', 'Villa Constitución',
    'Esperanza', 'Cañada de Gómez', 'San Lorenzo', 'Casilda',
  ],
  'Santiago del Estero': [
    'Santiago del Estero', 'La Banda', 'Termas de Río Hondo',
    'Frías', 'Añatuya', 'Loreto',
  ],
  'Tierra del Fuego': [
    'Ushuaia', 'Río Grande', 'Tolhuin',
  ],
  'Tucumán': [
    'San Miguel de Tucumán', 'Tafí Viejo', 'Concepción',
    'Banda del Río Salí', 'Yerba Buena', 'Aguilares',
    'Monteros', 'Famailla',
  ],
}

export const PROVINCIAS = Object.keys(PROVINCIAS_CIUDADES).sort()
export const getCiudades = (provincia) => PROVINCIAS_CIUDADES[provincia] || []
export default PROVINCIAS_CIUDADES
