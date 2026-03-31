# 🏋️ Rendimiento — Guía completa de instalación y deploy

---

## ¿Qué incluye esta app?

**Vista del alumno (tablet del gym):**
- Grilla de alumnos con buscador en tiempo real
- Múltiples sesiones simultáneas con pestañas y ✕ para cerrar
- Ciclo de rutinas A→B→C con sugerencia automática de "hoy"
- Ejercicios agrupados por etapa: Movilidad/Core · Fuerza/Aeróbico · Vuelta a la calma
- Detalle expandible por ejercicio: series/reps/peso + descripción + video + indicación personal
- Videos de YouTube embebidos y videos propios subidos
- Funciona 100% offline con datos cacheados

**Panel del instructor:**
- Login con PIN numérico (teclado en pantalla)
- Múltiples perfiles de instructor con roles Admin/Instructor
- Biblioteca global de ejercicios con descripción y video
- Rutinas por bloques nombrados y personalizables por alumno
- Plantillas predeterminadas reutilizables
- Copiar ciclo de otro alumno
- Log de actividad completo (sesiones + cambios con hora y autor)
- Configuración: logo real del gimnasio + nombre
- Sidebar colapsada en portrait (solo íconos) · expandida en landscape
- Responsive para tablet y celular

---

## PASO 1 — Crear proyecto Firebase (15 min)

### 1.1 Crear el proyecto
1. Ir a **https://console.firebase.google.com**
2. Clic en **"Crear proyecto"**
3. Nombre: `rendimiento-gym` (o el que quieras)
4. Desactivar Google Analytics → **Crear proyecto**

### 1.2 Habilitar Firestore
5. Menú lateral → **Firestore Database** → **Crear base de datos**
6. Elegir **"Comenzar en modo de prueba"**
7. Región: `us-east1` → **Hecho**

### 1.3 Habilitar Storage (para videos y logo)
8. Menú lateral → **Storage** → **Comenzar**
9. Modo de prueba → misma región → **Listo**

### 1.4 Obtener credenciales
10. ⚙️ **Configuración del proyecto** → **General**
11. Bajar hasta "Tus apps" → **`</>`** (icono web)
12. Registrar app → cualquier nombre → **Registrar**
13. **Copiar** el objeto `firebaseConfig` que aparece

---

## PASO 2 — Configurar el código

### 2.1 Pegar credenciales Firebase
Abrir `src/lib/firebase.js` y reemplazar:
```js
const firebaseConfig = {
  apiKey:            "PEGAR_AQUÍ",
  authDomain:        "PEGAR_AQUÍ",
  projectId:         "PEGAR_AQUÍ",
  storageBucket:     "PEGAR_AQUÍ",
  messagingSenderId: "PEGAR_AQUÍ",
  appId:             "PEGAR_AQUÍ"
};
```

---

## PASO 3 — Reglas de seguridad

### Firestore
Firebase Console → **Firestore** → **Reglas** → pegar contenido de `firestore.rules` → **Publicar**

### Storage
Firebase Console → **Storage** → **Reglas** → pegar contenido de `storage.rules` → **Publicar**

---

## PASO 4 — Crear el primer instructor (Admin)

Antes de abrir la app, necesitás crear al menos un instructor en Firestore manualmente:

1. Firebase Console → **Firestore** → **Iniciar colección**
2. ID de colección: `instructores`
3. ID de documento: (dejar automático)
4. Campos:
   - `name` (string): `Tu Nombre`
   - `pin` (string): `1234` ← cambialo por tu PIN real
   - `role` (string): `admin`
5. **Guardar**

Con eso podés entrar al panel y desde ahí crear más instructores.

---

## PASO 5 — Instalar dependencias y probar localmente

Necesitás **Node.js** instalado: https://nodejs.org (versión LTS)

```bash
# En la carpeta del proyecto:
npm install

# Iniciar en modo desarrollo:
npm start
```

Se abre en **http://localhost:3000** — verificá que todo funcione.

---

## PASO 6 — Deploy en Vercel (gratis, 10 min)

### 6.1 Crear cuenta en Vercel
Ir a **https://vercel.com** → registrarse con GitHub (gratis)

### 6.2 Subir el código a GitHub
Si no tenés GitHub: https://github.com → crear cuenta gratis

```bash
# En la carpeta del proyecto:
git init
git add .
git commit -m "Rendimiento gym app"

# Crear repo en github.com → "New repository" → copiá la URL
git remote add origin https://github.com/TU_USUARIO/rendimiento-gym.git
git push -u origin main
```

### 6.3 Deploy desde Vercel
1. En Vercel → **"Add New Project"**
2. **Importar** tu repo de GitHub
3. Framework: **Create React App** (lo detecta automáticamente)
4. Clic en **Deploy**
5. En ~2 minutos tenés una URL del tipo: `https://rendimiento-gym.vercel.app`

### 6.4 Dominio propio (opcional)
Si querés `rutinas.tuginmasio.com`:
- En Vercel → Settings → Domains → agregar tu dominio
- En tu proveedor de dominio (GoDaddy, Namecheap, etc.) apuntar DNS a Vercel

---

## PASO 7 — Instalar como app en la tablet

1. Abrir la URL de Vercel en **Chrome** en la tablet
2. Menú (⋮) → **"Agregar a pantalla de inicio"** o **"Instalar app"**
3. Aparece como ícono nativo en la pantalla de inicio
4. A partir de ahí funciona offline con los datos cacheados

---

## PASO 8 — Subir tu logo

1. Entrá al panel del instructor (PIN que configuraste en el Paso 4)
2. Ir a **Config**
3. Clic en **"Cambiar logo"** → seleccioná tu imagen (PNG/JPG)
4. El logo aparece en toda la app automáticamente

---

## Estructura del proyecto

```
src/
  lib/
    firebase.js      ← Credenciales Firebase
    db.js            ← Todas las operaciones con Firestore
  contexts/
    AuthContext.js   ← Autenticación de instructores
  hooks/
    useOnline.js     ← Detecta conexión
    useOrientation.js← Detecta portrait/landscape
  components/
    Sidebar.js       ← Barra lateral responsiva
    Toast.js         ← Notificaciones
  pages/
    SelectRole.js    ← Pantalla de inicio
    AlumnoSelect.js  ← Selección de alumno con buscador y tabs
    AlumnoRutina.js  ← Vista de rutina del alumno
    InstructorLogin.js ← PIN pad
    InstructorShell.js ← Layout con sidebar
    instructor/
      InstAlumnos.js    ← Gestión de alumnos
      InstRutinas.js    ← Gestión de rutinas/bloques
      InstEjercicios.js ← Biblioteca de ejercicios
      InstPlantillas.js ← Plantillas predeterminadas
      InstActividad.js  ← Log de actividad
      InstConfig.js     ← Logo, nombre, instructores
public/
  sw.js             ← Service Worker (offline)
  manifest.json     ← Config PWA
```

---

## Cómo funciona el sistema offline

| Situación | Comportamiento |
|-----------|----------------|
| Tablet con WiFi | Lee/escribe directo en Firebase |
| Tablet sin internet | Muestra datos del caché local (IndexedDB) |
| Instructor carga rutina desde el celu | Se guarda en Firebase en tiempo real |
| Tablet vuelve a tener internet | Sincroniza automáticamente |

---

## Soporte

Si tenés dudas en cualquier paso, podés pedirle ayuda a Claude con el mensaje exacto del error que aparece.
