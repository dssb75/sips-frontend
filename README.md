# SIPS Frontend

**Sistema minimalista de gestión de tareas** construido con Next.js 16, React 19 y TypeScript.

## Visión General

Frontend moderno y limpio que implementa una interfaz CRUD para gestionar tareas. Sigue principios de arquitectura hexagonal con separación clara entre capas de presentación, lógica de negocio y comunicación externa.

### Características

- ✅ **CRUD completo**: Crear, listar, actualizar y eliminar tareas
- ✅ **Interfaz intuitiva**: UI minimalista con Tailwind CSS
- ✅ **Edición inline**: Cambiar descripción sin navegación
- ✅ **State management**: React Hooks para estado local
- ✅ **TypeScript strict**: Tipado fuerte en toda la aplicación
- ✅ **Service layer**: Abstracción de llamadas API
- ✅ **API proxy**: Next.js rewrites elimina problemas de CORS
- ✅ **Error handling**: Mensajes de error al usuario
- ✅ **Loading states**: Indicadores de carga

## Estructura del Proyecto

```
sips-frontend/
├── app/                           # Next.js App Router
│   ├── layout.tsx                # Layout raíz con metadata
│   ├── page.tsx                  # Página principal
│   ├── globals.css               # Estilos globales Tailwind
│   └── favicon.ico
├── components/
│   └── CrudTareas.tsx            # Componente principal de CRUD
├── services/
│   └── tareas.ts                 # Cliente HTTP abstrayendo Axios
├── public/                        # Assets estáticos
├── package.json                   # Dependencias y scripts
├── tsconfig.json                  # Configuración TypeScript
├── next.config.ts                # Config de rewrites para API proxy
├── tailwind.config.ts            # Config de Tailwind CSS
└── README.md                      # Este archivo
```

## Arquitectura por Capas

### 1. **Capa de Presentación** (`app/`, `components/`)
- `layout.tsx`: Estructura HTML raíz, metadata SEO, estilos globales
- `page.tsx`: Punto de entrada de la app
- `CrudTareas.tsx`: Componente principal con toda la lógica de UI

**Responsabilidades**:
- Renderizar interfaz de usuario
- Capturar interacciones del usuario
- Mostrar estados (carga, errores, éxito)
- Gestionar estado local de componentes

### 2. **Capa de Lógica de Negocio** (`components/CrudTareas.tsx`)
Implementa las reglas de negocio:
- Validación de descripción no vacía
- Alternancia de estado de completitud
- Refresh automático de lista tras cambios
- Edición inline con confirmación
- Manejo de errores con mensajes claros

### 3. **Capa de Acceso a Datos** (`services/tareas.ts`)
- Abstrae llamadas HTTP a través de Axios
- Define interfaz `Tarea` tipada
- Proporciona funciones específicas del dominio: `listarTareas()`, `crearTarea()`, etc.
- Manejo centralizado de endpoints: `/api/tasks`

### 4. **API Gateway** (`next.config.ts`)
- Configura rewrites: `/api/*` → `http://localhost:8080/*`
- Elimina necesidad de CORS explícito en cliente
- Proxy transparente al backend

## Requisitos Previos

- **Node.js** 18.17+ 
- **npm** o **yarn**
- **Backend Go** corriendo en `http://localhost:8080`

## Instalación

```bash
# Instalar dependencias
npm install

# Crear archivo .env.local (opcional, por si necesitas variables)
# touch .env.local
```

## Ejecución

### Desarrollo (Hot reload)

```bash
npm run dev
```

Accede a [http://localhost:3000](http://localhost:3000)

### Build para producción

```bash
npm run build
npm start
```

## Guía de Características

### Crear Tarea

1. Ingresa descripción en el input
2. Presiona "Agregar" o Enter
3. Validación rechaza descripciones vacías
4. Nueva tarea aparece en la lista con estado no completada

**Regla**: Las tareas nuevas siempre comienzan como no completadas (`completada: false`)

### Completar/Descompletar Tarea

- **Click en descripción**: Alterna estado de completitud
- **Click en checkbox**: También alterna estado
- Las tareas completadas muestran strikethrough text

**Regla**: Hacer click es la operación principal - refleja la mayor parte del uso

### Editar Descripción

1. Click en botón "Editar"
2. Modal inline permite cambiar texto
3. Botón "Guardar" persiste cambios
4. Botón "Cancelar" descarta cambios

**Regla**: Solo se puede cambiar descripción, no el estado

### Eliminar Tarea

- Click en "Eliminar" remueve tarea permanentemente
- Se recargan todos los datos del servidor
- Actualmente sin confirmación (podría agregarse)

## Mejores Prácticas Implementadas

### 1. **TypeScript Strict**
```typescript
interface Tarea {
  id: number;
  descripcion: string;
  completada: boolean;
}
```
- Todas las funciones tienen tipos explícitos
- No hay `any` implícitos

### 2. **React Hooks Correctamente**
```typescript
// useEffect solo carga al montar
useEffect(() => { cargarTareas(); }, []);

// useState para cada estado independiente
const [tareas, setTareas] = useState<Tarea[]>([]);
```

### 3. **Service Layer Abstraction**
Las funciones CRUD están aisladas en `services/tareas.ts`:
```typescript
export async function listarTareas(): Promise<Tarea[]>
export async function crearTarea(tarea: Omit<Tarea, 'id'>): Promise<void>
// ...
```
Beneficio: Cambiar la API solo requiere modificar un archivo

### 4. **Error Handling**
Todos los handlers tienen try-catch:
```typescript
try {
  await actualizarTarea(...);
  // reload
} catch (err) {
  setError("Mensaje amigable al usuario");
}
```

### 5. **Componentes Monolíticos vs Pequeños**
CrudTareas es un componente grande porque:
- Carga simple (una tabla, una form)
- Baja complejidad
- Menos props/re-renders innecesarios

Si crece, separar en: `TaskList`, `TaskForm`, `TaskItem`

### 6. **Tailwind CSS Best Practices**
```tailwind
/* Usa clases semánticas de Tailwind */
bg-gradient-to-br from-slate-50 to-slate-100
hover:shadow-md transition-shadow

/* Responsive y accesibilidad */
gap-2 flex-wrap
aria-label="..."
```

## Adiciones Futuras

Posibles mejoras manteniendo minimalismo:

1. **Confirmación de eliminación**
   ```typescript
   if (!confirm("¿Eliminar esta tarea?")) return;
   ```

2. **Animar transiciones**
   ```typescript
   animate-fadeIn, animate-slideDown
   ```

3. **Temas light/dark**
   ```typescript
   const [theme, setTheme] = useState("light");
   ```

4. **Búsqueda y filtros**
   ```typescript
   const filtered = tareas.filter(t => 
     t.descripcion.includes(searchTerm)
   );
   ```

5. **Persistencia local**
   ```typescript
   localStorage.setItem("tareas", JSON.stringify(tareas));
   ```

## Troubleshooting

### Error: "Network Error" o "Failed to fetch"

**Causa**: Backend no está corriendo o no está en `localhost:8080`

**Solución**:
```bash
# Verificar que backend está activo
curl http://localhost:8080/tasks

# Reiniciar frontend
npm run dev
```

### Las tareas no se cargan

**Causa**: Backend está activo pero hay un error en la respuesta

**Solución**:
```bash
# Abrir DevTools (F12)
# Console tab: Ver error específico
# Network tab: Inspeccionar request a `/api/tasks`
```

### CORS errors (aunque no debería haber)

**Causa**: API proxy en `next.config.ts` no está configurado correctamente

**Solución**: Verificar que `next.config.ts` tiene:
```typescript
rewrites: async () => ({
  beforeFiles: [
    {
      source: "/api/:path*",
      destination: "http://localhost:8080/:path*",
    },
  ],
})
```

## Variables de Ambiente

Actualmente la app no requiere variables de ambiente. El backend está hardcodeado en:
- Desarrollo: `http://localhost:8080`
- Proxy: A través de `/api/*` en next.config.ts

Para personalizar, crear `.env.local`:
```env
NEXT_PUBLIC_API_URL=/api
```

## Scripts Disponibles

```bash
npm run dev       # Iniciar servidor de desarrollo
npm run build     # Build para producción
npm start         # Ejecutar build de producción
npm run lint      # ESLint (si está configurado)
npm run type-check # TypeScript check (si está configurado)
```

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js | 16.1.6 |
| Runtime | React | 19.2.3 |
| Lenguaje | TypeScript | 5.x |
| Estilos | Tailwind CSS | 4.2.1 |
| HTTP Client | Axios | 1.7.x |
| Ges. Paquetes | npm | Última |

## Contribución

1. Mantener código minimalista (no agregar features innecesarios)
2. Respetar estructura de carpetas
3. Agregar comentarios JSDoc en funciones nuevas
4. TypeScript strict sin excepciones

## Licencia

Proyecto educativo - Uso libre

---

**Última actualización**: 2025
**Mantenedor**: Tu nombre


