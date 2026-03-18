import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawQuestionnaires = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../src/data/auto_hogar.json'), 'utf-8')
);

const sectionAliases = {
  Auto: {
    datos_del_tomador: 'tomador',
    datos_del_riesgo: '',
    propietario: 'propietario',
    conductor_habitual: 'conductor',
    otro_conductor: 'otro_conductor',
    bonificacion: 'bonificacion',
    otros_datos: '',
  },
  Hogar: {
    datos_del_tomador: 'tomador',
    datos_del_riesgo: '',
    capitales_a_asegurar: '',
    otros_datos: '',
  },
};

const simpleSchemas = {
  Comercio: {
    type: 'Comercio',
    title: 'Cuestionario de Seguro de Comercio',
    fields: [
      { name: 'section_datos_tomador', label: 'Datos del Tomador', type: 'section', span: 12 },
      { name: 'tomador_nombre', label: 'Nombre', type: 'text', span: 6 },
      { name: 'tomador_apellidos_empresa', label: 'Apellidos / Empresa', type: 'text', span: 6 },
      { name: 'tomador_nif_cif', label: 'NIF / CIF', type: 'text', span: 6 },
      { name: 'tomador_fecha_nacimiento', label: 'F. de Nacimiento', type: 'date', span: 6 },
      { name: 'tomador_direccion', label: 'Dirección', type: 'text', span: 12 },
      { name: 'tomador_cod_postal', label: 'Código Postal', type: 'text', span: 4 },
      { name: 'tomador_telefono', label: 'Teléfono', type: 'tel', span: 4 },
      { name: 'tomador_email', label: 'E-mail', type: 'email', span: 4 },
      { name: 'section_datos_riesgo', label: 'Datos del Riesgo', type: 'section', span: 12 },
      { name: 'riesgo_direccion', label: 'Dirección', type: 'text', span: 12 },
      { name: 'riesgo_cod_postal', label: 'Código Postal', type: 'text', span: 4 },
      { name: 'riesgo_actividades', label: 'Actividad/es', type: 'text', span: 12 },
      { name: 'riesgo_num_empleados', label: 'Nº de Empleados', type: 'number', span: 4 },
      { name: 'riesgo_facturacion', label: 'Facturación', type: 'number', span: 4 },
      { name: 'riesgo_ano_construccion', label: 'Año de Construcción', type: 'number', span: 4 },
      { name: 'riesgo_ano_reforma_total', label: 'Año de Reforma Total', type: 'number', span: 4 },
      { name: 'riesgo_ano_reforma_parcial', label: 'Año de Reforma Parcial', type: 'number', span: 4 },
      { name: 'riesgo_situacion', label: 'Situación', type: 'text', span: 4 },
      { name: 'riesgo_superficie_m2', label: 'Superficie m²', type: 'number', span: 4 },
      { name: 'riesgo_ubicacion', label: 'Ubicación', type: 'text', span: 4 },
      { name: 'riesgo_materiales_constructivos_combustibles', label: 'Materiales Constructivos / Combustibles', type: 'textarea', span: 12 },
      { name: 'riesgo_regimen', label: 'Régimen', type: 'text', span: 4 },
      { name: 'section_medidas_seguridad', label: 'Medidas de Seguridad', type: 'section', span: 12 },
      { name: 'seguridad_puerta_principal', label: 'Puerta Principal', type: 'text', span: 6 },
      { name: 'seguridad_puerta_secundaria', label: 'Puerta Secundaria', type: 'text', span: 6 },
      { name: 'seguridad_ventanas', label: 'Ventanas', type: 'text', span: 6 },
      { name: 'seguridad_escaparates', label: 'Escaparates', type: 'text', span: 6 },
      { name: 'seguridad_dispone_alarma', label: 'Dispone de Alarma', type: 'text', span: 4 },
      { name: 'seguridad_vigilancia_24h', label: 'Vigilancia 24h', type: 'text', span: 4 },
      { name: 'seguridad_existencia_caja_fuerte', label: 'Existencia de Caja Fuerte', type: 'text', span: 4 },
      { name: 'seguridad_incendio', label: 'Medidas de Seguridad Contra Incendio', type: 'textarea', span: 12 },
      { name: 'section_capitales', label: 'Capitales', type: 'section', span: 12 },
      { name: 'capitales_continente', label: 'Continente', type: 'number', span: 4 },
      { name: 'capitales_mobiliario_ajuar', label: 'Mobiliario / Ajuar', type: 'number', span: 4 },
      { name: 'capitales_existencias', label: 'Existencias', type: 'number', span: 4 },
      { name: 'capitales_modalidad', label: 'Modalidad', type: 'text', span: 6 },
      { name: 'capitales_maq_eq_electronicos', label: 'Maq. y Eq. Electrónicos', type: 'number', span: 6 },
      { name: 'section_otros_datos', label: 'Otros Datos', type: 'section', span: 12 },
      { name: 'otros_fecha_efecto', label: 'Fecha de Efecto', type: 'date', span: 6 },
      { name: 'otros_forma_pago', label: 'Forma de Pago', type: 'text', span: 6 },
      { name: 'otros_observaciones', label: 'Observaciones', type: 'textarea', span: 12 },
    ],
  },
  'Salud Extranjería': {
    type: 'Salud Extranjería',
    title: 'Cuestionario Seguro de Salud Extranjería',
    fields: [
      { name: 'section_tomador', label: 'Tomador', type: 'section', span: 12 },
      { name: 'tomador_nombre_apellidos', label: 'Nombre y Apellidos', type: 'text', required: true, span: 12 },
      { name: 'tomador_nie', label: 'NIE', type: 'text', required: true, span: 4 },
      {
        name: 'tomador_sexo',
        label: 'Sexo',
        type: 'select',
        required: true,
        span: 4,
        options: [
          { label: 'Hombre', value: 'Hombre' },
          { label: 'Mujer', value: 'Mujer' },
        ],
      },
      { name: 'tomador_fecha_nacimiento', label: 'Fecha de Nacimiento', type: 'date', required: true, span: 4 },
      { name: 'tomador_direccion_completa', label: 'Dirección Completa', type: 'text', required: true, span: 12 },
      { name: 'tomador_telefono', label: 'Teléfono', type: 'tel', required: true, span: 6 },
      { name: 'tomador_email', label: 'Email', type: 'email', required: true, span: 6 },
      {
        name: 'info_poliza_anterior',
        label: 'Se recomienda aportar póliza actual',
        type: 'info',
        span: 12,
        helpText: 'Usa el paso de adjuntos para subir la póliza anterior o documentación complementaria.',
      },
      {
        name: 'consentimiento',
        label: 'Estoy de acuerdo con la política de privacidad.',
        type: 'checkbox',
        required: true,
        span: 12,
        helpText:
          'De acuerdo con lo establecido por el Reglamento (UE) 2016/679, y en la Ley 3/2018 en materia de Protección de datos, le informamos que el Responsable del Tratamiento de sus datos es ALBROK MEDIACIÓN SA. Utilizamos sus datos para prestarle los servicios que nos ha solicitado, así como enviarle comunicaciones comerciales que sean de su interés. Legitimados en la ejecución del contrato en su caso o en aplicación de las medidas precontractuales. No se cederán sus datos a terceros salvo obligación legal.\n\nAsimismo, le informamos que tiene derecho a acceder, rectificar y suprimir los datos, así como otros derechos, indicados en la información adicional, que puede ejercer dirigiéndose a privacidad@albroksa.com o C/ Francisco Guerra Díaz 12 P4 1ºC, 06011 Badajoz (España).\n\nPuede consultar información adicional y detallada sobre Protección de Datos aquí: https://albroksa.com/politica-de-privacidad',
      },
    ],
  },
};

const labelAliases = {
  dni_cif: 'dni_cif',
  ano_de_construccion: 'ano_construccion',
  metros_cuadrados_construidos: 'metros_cuadrados',
  forma_de_pago: 'forma_pago',
  numero_de_poliza: 'numero_poliza',
  compania_actual: 'compania_actual',
  matricula_asegurada: 'matricula_asegurada',
  fecha_de_carnet_de_conducir: 'fecha_carnet_conducir',
};

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeSpan(span) {
  const parsed = Number(span);
  if ([3, 4, 6, 12].includes(parsed)) {
    return parsed;
  }
  return 12;
}

function withUniqueName(baseName, usedNames) {
  let candidate = baseName || 'campo';
  let counter = 2;

  while (usedNames.has(candidate)) {
    candidate = `${baseName}_${counter}`;
    counter += 1;
  }

  usedNames.add(candidate);
  return candidate;
}

function getSectionAlias(type, sectionSlug) {
  return sectionAliases[type]?.[sectionSlug] ?? sectionSlug;
}

function buildBaseName(type, sectionSlug, label) {
  const labelSlug = labelAliases[slugify(label)] || slugify(label);
  const sectionAlias = getSectionAlias(type, sectionSlug);

  if (!sectionAlias) {
    return labelSlug;
  }

  return `${sectionAlias}_${labelSlug}`;
}

function buildNameField(type, sectionSlug, field, usedNames) {
  const sectionAlias = getSectionAlias(type, sectionSlug);
  const label = sectionAlias ? 'Nombre completo' : field.label || 'Nombre completo';
  const baseName = sectionAlias || 'nombre';

  return {
    name: withUniqueName(baseName, usedNames),
    label,
    type: 'text',
    required: field.isRequired,
    span: normalizeSpan(field.layoutGridColumnSpan),
  };
}

function buildAddressFields(type, sectionSlug, field, usedNames) {
  const sectionAlias = getSectionAlias(type, sectionSlug);
  const addressPrefix = sectionAlias ? `${sectionAlias}_direccion` : 'direccion';
  const cityPrefix = sectionAlias ? `${sectionAlias}_ciudad` : 'ciudad';
  const provincePrefix = sectionAlias ? `${sectionAlias}_provincia` : 'provincia';
  const postalCodePrefix = sectionAlias ? `${sectionAlias}_codigo_postal` : 'codigo_postal';
  const countryPrefix = sectionAlias ? `${sectionAlias}_pais` : 'pais';

  return [
    {
      name: withUniqueName(addressPrefix, usedNames),
      label: 'Dirección',
      type: 'text',
      required: field.isRequired,
      span: 12,
    },
    {
      name: withUniqueName(cityPrefix, usedNames),
      label: 'Ciudad',
      type: 'text',
      required: field.isRequired,
      span: 4,
    },
    {
      name: withUniqueName(provincePrefix, usedNames),
      label: 'Provincia',
      type: 'text',
      required: field.isRequired,
      span: 4,
    },
    {
      name: withUniqueName(postalCodePrefix, usedNames),
      label: 'Código Postal',
      type: 'text',
      required: field.isRequired,
      span: 4,
    },
    {
      name: withUniqueName(countryPrefix, usedNames),
      label: 'País',
      type: 'text',
      required: field.isRequired,
      span: 6,
    },
  ];
}

function buildField(type, sectionSlug, field, usedNames) {
  if (field.type === 'page') {
    return [];
  }

  if (field.type === 'section') {
    return [
      {
        name: withUniqueName(`section_${field.id}`, usedNames),
        label: field.label || 'Sección',
        type: 'section',
        span: 12,
      },
    ];
  }

  if (field.type === 'name') {
    return [buildNameField(type, sectionSlug, field, usedNames)];
  }

  if (field.type === 'address') {
    return buildAddressFields(type, sectionSlug, field, usedNames);
  }

  if (field.type === 'fileupload') {
    return [
      {
        name: withUniqueName(`info_${field.id}`, usedNames),
        label: field.label || 'Adjunta la documentación en el paso siguiente',
        type: 'info',
        span: 12,
        helpText: 'Usa el paso de adjuntos para subir esta documentación.',
      },
    ];
  }

  if (field.type === 'consent') {
    return [
      {
        name: withUniqueName('consentimiento', usedNames),
        label: field.checkboxLabel || field.label || 'Consentimiento',
        type: 'checkbox',
        required: field.isRequired,
        span: 12,
        helpText: field.description,
      },
    ];
  }

  if (field.type === 'multiselect') {
    const choices = Array.isArray(field.choices) ? field.choices : [];

    return [
      {
        name: withUniqueName(buildBaseName(type, sectionSlug, field.label || `campo_${field.id}`), usedNames),
        label: field.label || 'Selección',
        type: 'checkboxGroup',
        required: field.isRequired,
        span: normalizeSpan(field.layoutGridColumnSpan),
        options: choices.map((choice) => ({
          label: choice.text || choice.value || '',
          value: choice.value || choice.text || '',
        })),
      },
    ];
  }

  const inputTypeMap = {
    text: 'text',
    date: 'date',
    number: 'number',
    textarea: 'textarea',
    email: 'email',
    phone: 'tel',
  };

  const typeName = inputTypeMap[field.type] || 'text';

  return [
    {
      name: withUniqueName(buildBaseName(type, sectionSlug, field.label || `campo_${field.id}`), usedNames),
      label: field.label || 'Campo',
      type: typeName,
      required: field.isRequired,
      span: typeName === 'textarea' ? 12 : normalizeSpan(field.layoutGridColumnSpan),
      helpText: field.description,
    },
  ];
}

function buildImportedSchema(type, formKey) {
  const rawForm = rawQuestionnaires[formKey];
  const usedNames = new Set();
  const fields = [];
  let currentSectionSlug = '';

  for (const rawField of rawForm.fields) {
    if (rawField.type === 'section') {
      currentSectionSlug = slugify(rawField.label || `section_${rawField.id}`);
    }

    fields.push(...buildField(type, currentSectionSlug, rawField, usedNames));
  }

  return {
    type,
    title: rawForm.title,
    fields,
  };
}

export const defaultFormSchemas = {
  Auto: buildImportedSchema('Auto', '0'),
  Hogar: buildImportedSchema('Hogar', '1'),
  Comercio: simpleSchemas.Comercio,
  'Salud Extranjería': simpleSchemas['Salud Extranjería'],
};

export function getDefaultFormularioByRamo(ramo) {
  return defaultFormSchemas[ramo] || null;
}
