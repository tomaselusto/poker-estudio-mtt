# Poker Estudio v4 — Mesas 6-max y 8-max

## Novedad v4 (16/11/2026)

- Selector global **Mesa del torneo: 8-max / 6-max**, visible en todos los módulos.
- Posiciones dinámicas: **8-max = UTG, UTG+1, LJ, HJ, CO, BTN, SB, BB**; **6-max = UTG, HJ, CO, BTN, SB, BB**.
- El visor de rangos, RFI, defensa frente a open/shove, tamaños de acción y estimador de rango rival responden a la mesa seleccionada.
- **Importante:** la biblioteca existente era de 8-max. Para el modo 6-max se implementa una **equivalencia posicional** a partir del número de rivales por actuar: `UTG(6) → LJ(8)`, y `HJ/CO/BTN/SB/BB → misma posición(8)`. El programa marca todas esas pantallas como **aproximadas**, nunca como un solver 6-max exacto. La equivalencia preserva un ante de BB de 1 BB, tamaños de apuestas y stacks de la base. En ramas de defensa no documentadas sigue usando la heurística didáctica previa.
- Cambio de nombre del caché PWA para que Render y los móviles reciban la versión nueva.
- Se conservan los seis módulos y los dos selectores visuales del proyecto anterior.

## Próxima etapa planificada: modalidades

El modo actual utiliza **Vanilla / clásico chip EV sin bounty**. Para KO o PKO no se deben reutilizar los mismos rangos como si hubieran sido resueltos en esos formatos. La siguiente ampliación incluirá:

- Selector de modalidad: **Vanilla, KO fijo, PKO progresivo**.
- Valor del bounty del rival, bounty propio, porción en efectivo/porción progresiva, jugadores involucrados y quién cubre a quién.
- Stacks en BB, número de jugadores vivos, estructura de pagos e ICM (cuando correspondan).
- **KO fijo:** bounty fijo que cobra quien elimina. **PKO:** parte se cobra y parte se añade al bounty del eliminador, sujeto a reglas particulares del torneo.
- Identificación separada de rangos **solucionados/importados** vs. ajustes **orientativos**. Nunca mostrar una supuesta frecuencia GTO exacta de PKO sin una solución apropiada.

## Despliegue Render / GitHub

Conservá `public/`, `render.yaml` y `README.md` en la raíz del repositorio conectado a Render. Actualizá los archivos, hacé commit y push a `main`. El Static Site publica `public`. La aplicación no requiere backend.

## Verificaciones

- `node --check`: JS externo e inline sin errores sintácticos.
- Pruebas automatizadas de mapeo de todas las aperturas por posición a 10, 15, 20, 40 y 50 BB, combinaciones de mano y tabla de 169 casillas.
- **Limitación de la validación aquí:** no fue posible ejecutar pruebas de interacción de navegador porque la instancia de Chromium del entorno bloquea navegación local; realizar una prueba visual y móvil después del despliegue.

---

# Poker Estudio v3 — Laboratorio interactivo de MTT

Aplicación **estática, sin servidor ni base de datos**, para estudiar Texas Hold'em MTT 8-max. Se ejecuta con HTML, CSS y JavaScript en el navegador.

## Novedades v3

- **Selector visual de 52 cartas** por palo/rango: Hero, mano rival exacta y board. Selección reversible, sin cartas duplicadas, con adaptación a celular.
- **Matriz de 169 manos editable** en **Equity** (modo mano vs. rango) y **Combinatoria**. Tocando cada clase, cambia la frecuencia **0 → 100 → 50 → 25 → 0%**; Shift + clic la elimina.
- **Blockers automáticos:** muestra combos originales, disponibles, ponderados y bloqueados con las cartas de Hero y el board. Ej.: Hero `As Kd` deja `AA=3`, `AKs=2`, `AKo=7`.
- **Presets**: UTG/CO 40 BB, BTN 20 BB, BTN vs CO 3-bet y BB vs BTN call. Se cargan desde las matrices de referencia existentes. Algunos cruces son heurísticos; las frecuencias mixtas de solver **no se infieren** a partir de la acción predominante.
- **Sincronización bidireccional** con las cajas de texto de edición manual, la calculadora de equity, combinatoria y el estimador rival. Las cartas seleccionadas se utilizan directamente para los cálculos.
- **Resultados obsoletos:** los cálculos de equity se invalidan al editar cartas/rangos, incluso cuando una simulación está en progreso.

## Módulos v2 que se conservaron

1. Visor de rangos preflop por posición, stack y acción anterior.
2. Pot odds y EV inmediato de call (heads-up).
3. Odds implícitas condicionales.
4. Equity contra mano exacta o rango: exacta con flop/turn/river ante mano exacta; exacta en river frente a rango, Monte Carlo en otros casos.
5. Combinatoria con pesos por clase de mano.
6. Estimador rival por stack, posición y acción.

## Estructura

```
.
├── public/
│   ├── index.html        # Interfaz y visor original
│   ├── tools.js          # Motor de equity, pot odds, combos y estimador
│   ├── tools.css
│   ├── visual.js         # Selector 52 cartas y matriz editable
│   └── visual.css
├── render.yaml           # Render Static Site
└── README.md
```

## Actualizar el sitio Render ya existente

1. Descomprimí el ZIP.
2. Copiá **los cinco archivos de `public/`** al directorio `public/` del repositorio de GitHub existente. No elimines el resto de la configuración.
3. Actualizá `README.md` y conservá `render.yaml`.
4. Hacé **commit y push** a la rama que está conectada a Render. Si el despliegue automático está habilitado, Render actualizará el sitio.
5. En Render, confirmá **Static Site**, `Publish Directory: public` y sin build de Node ni backend.

Para un despliegue nuevo: Render → New → Static Site, conectar el repositorio, y usar como `Publish Directory` `public`. Alternativamente, Render → New → Blueprint con `render.yaml`.

## HTML autónomo / offline

También se entrega **`Poker_Estudio_v3_Offline.html`** por separado, que integra HTML, CSS y JS en un archivo. Podés abrirlo sin conexión en Chrome/Edge. El ZIP de Render utiliza archivos separados para facilitar mantenimiento.

## Pruebas realizadas

- Se generan las 52 cartas y 169 clases en ambas herramientas.
- Selector de cartas: evita seleccionar una carta ya ocupada por otra posición.
- Ciclo 100/50/25/0, Shift + clic, carga de presets y sincronización con texto.
- Combinatoria `Hero=As Kd; rival=AA,AKs,AKo`: 3, 2 y 7 combos disponibles respectivamente (12 en total).
- Equity exacta ante board royal flush compartido: empate, 50% para cada jugador.
- Capturas de escritorio y celular; sin errores JS en las pruebas de navegación.

## Límites importantes

- **No calcula ICM ni EV postflop completo**. Equity supone que se llega al showdown. Las odds implícitas son un modelo simplificado.
- Los presets y estimaciones rivales **no son rangos reales de un jugador** ni un solver para cada stack/situación; varias respuestas se basan en heurísticas y deben tratarse como orientativas.
- Las casillas cargadas por preset representan acciones predominantes al 100%, **no** mezclas de solver exactas. Editalas visualmente si querés modelar frecuencias.
- Sin cuentas ni almacenamiento permanente: las selecciones quedan en memoria mientras está abierta la página. No se transfieren datos a servidores.

## Versión v3.1 — Instalación PWA en teléfono

**Se agregó:** `manifest.webmanifest`, `sw.js`, íconos 192/512/180 y ajustes táctiles en móviles. Una vez publicado en Render con HTTPS, el sitio puede instalarse como app web (sin App Store ni Google Play). Luego de una primera carga completa, el service worker guarda los archivos para permitir uso offline.

**Android (Chrome):** abrir la URL de Render, menú ⋮ > `Instalar aplicación` (o `Agregar a pantalla principal`, según el navegador).

**iPhone (Safari):** abrir la URL, botón Compartir > `Agregar a pantalla de inicio`; activar `Abrir como app web` si aparece.

**Antes del deploy:** se puede probar en la misma red local sirviendo la carpeta `public` desde la PC (por ejemplo, `python -m http.server 8000 --directory public`) y entrando desde el teléfono a `http://IP_LOCAL_DE_PC:8000`. Este origen HTTP por LAN sirve para probar responsive, pero no para instalar una PWA completa. Para instalar como PWA necesita HTTPS público o localhost del dispositivo.

**Render (sitio nuevo):** 1) subir el contenido de este ZIP a la raíz de un repositorio GitHub (no subir la carpeta contenedora), 2) Render > New > Static Site, 3) conectar repo, 4) `Build Command: echo ready`, `Publish Directory: public`, 5) crear y esperar URL. Si ya existe el sitio, actualizar los archivos `public` y push a `main`. También disponible despliegue via `render.yaml` como Blueprint.

**Caché:** cuando subas una nueva versión importante, actualizá el nombre `CACHE_NAME` en `public/sw.js` para invalidar recursos offline anteriores. La versión actual prioriza la red y utiliza archivos guardados si no hay conexión.
