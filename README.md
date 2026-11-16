# Poker Estudio v4.4 — ICM integrado a rangos KO/PKO

Conserva todas las funciones de v4.3: RFI 6-max/8-max, Vanilla / KO / PKO, equity, pot odds, odds implícitas, combinatoria, bounty y constructor de rangos por cEV. **Nuevo:** módulo de **ICM / $EV** conectado a las 169 clases del constructor anterior.

## Método

- ICM Malmuth–Harville sobre **todo el conjunto de jugadores que siguen vivos**, 2–12 sobrevivientes. Utiliza probabilidades recursivas optimizadas por subconjuntos; computa equidad monetaria de los **premios regulares** (1.º a N.º), incluyendo cobros de puestos eliminados.
- Cada jugador se carga con **su stack fuera del pozo en el instante de decisión**. El pozo se carga una sola vez por separado y ya contiene ciegas/antes/apuestas de otros jugadores. Se comprueba conservación de fichas en fold/ganar/perder/empatar.
- En **call a all-in**, el rival tiene 0 BB fuera del pozo. Se muestra valor ICM de foldear, ganar, perder, empatar; equity necesaria de cEV y $EV, y prima de riesgo ICM.
- En **reshove contra apertura**, Hero puede tener una cobertura mayor o menor que la del rival. El sistema devuelve fichas no igualadas y contabiliza fold equity separadamente; el rival no está eliminado cuando conserva fichas.
- En KO y PKO, solo el **bounty inmediato** en dinero se suma cuando Hero efectivamente elimina al rival. La parte transferida al propio bounty en PKO se presenta, pero **no se valora automáticamente**.
- La matriz de 169 clases reutiliza las probabilidades de ganar y empatar de «Decisiones KO/PKO», calculadas por Monte Carlo. Señala +$EV, −$EV, frontera, +cEV/−$EV y permite CSV de comparación.

## Uso paso a paso

1. En «Decisiones KO/PKO», configurá *call contra open shove* o *reshove contra open raise* y un **rango rival** editable. Pulsá «Calcular matriz completa».
2. Elegí «🏆 Analizar esta matriz con ICM» para ir al nuevo módulo e importar las 169 probabilidades.
3. Cargá los **stacks restantes de todos los participantes del torneo**. Las dos primeras filas son Hero y rival. Es importante no cargar solo la mesa si quedan otras mesas jugando.
4. Cargá los **premios de 1.º a último puesto restante**, en orden descendente, incluyendo premios de 0 si corresponde. La moneda es libre, pero tiene que ser consistente con la del bounty.
5. Verificá pozo, call u open, frecuencia de fold al reshove, modalidad, cantidad total del bounty y parte inmediata en PKO. Pulsá «Calcular ICM y $EV» si modificaste el escenario.
6. Consultá en la matriz la vista de $EV, cEV o «+cEV pero −$EV»; clickeá cada mano para mostrar EV, muestra y señal de incertidumbre. Exportá CSV para estudiar.

## Ejemplo precargado, no un torneo real

6 jugadores; stacks fuera del pozo: 25 / 0 / 27 / 21 / 17 / 13 BB; pozo 15,5 BB; Hero paga 12 BB; premios de 1.º a 6.º: 2500 / 1600 / 1100 / 800 / 600 / 400. Si Hero tiene 40% de victorias y 0% de empates, el umbral **chip EV** es 43,64%, pero el umbral **ICM** de los premios es aprox. 49,7% (Vanilla). Cambiar a KO/PKO y un bounty cobrable modifica el umbral monetario.

## Advertencias que importan

- El ICM de premios es **exacto dentro del modelo Malmuth–Harville**, no una predicción exacta del torneo. No incluye habilidad, posiciones, ICM de otras mesas desconocidas, future game, ni árboles de respuesta óptima.
- **No cubre 13 o más jugadores restantes**, ni aislamiento con jugadores detrás, side pots, múltiples bounties, ni casos multiway.
- La matriz importada se basa en equity **estimada por Monte Carlo**, rangos arbitrados por el usuario y una frecuencia de fold al reshove externa al modelo. Un resultado favorable **no es una prescripción GTO**. Las bandas de 95% reflejan solo incertidumbre del muestreo.
- En PKO, la parte futura de recompensas recibidas en la cabeza de Hero puede tener valor, pero **no está integrada** en el $EV. Es un límite especialmente importante cerca del final de torneos PKO.
- El cálculo de $EV usa un solo pozo heads-up plenamente disputado. No extrapolarlo a situaciones con múltiples pozos o acciones detrás.
- No utilizar software de asistencia en manos en curso si el reglamento del torneo lo prohíbe.

## Render — Actualizar sitio existente

Descomprimí el ZIP, copiá todo el contenido de `public/` a la carpeta `public/` de tu repo `poker-estudio-mtt`, conservando `render.yaml`:

```bash
git add .
git commit -m "Poker Estudio v4.4 - ICM y rangos por valor monetario"
git push origin main
```

Render Static Site: Publish Directory = `public`. No hace falta backend ni base de datos. El service worker usa versión de caché nueva; si el celular mantiene la anterior, cerrá y reabrí la PWA después de actualizar.

## Validación

- Tests del núcleo: ICM simétrico, ganador se lleva todo, jugador eliminado, conservación de premios y fichas, llamadas, reshoves, PKO con bounty inmediato, 100 estructuras aleatorias.
- Prueba en navegador del escenario, cambio Vanilla/KO/PKO, validación de premios, presets de 6 y 8 jugadores, simulación de las 169 manos, importación a ICM, selección de mano y reshove.
- `node --check` de todos los JS; HTML standalone con archivos incrustados sin dependencias de red; ZIP verificado.

## Referencias

- https://blog.gtowizard.com/icm-basics/
- https://www.pokerstrategy.com/strategy/sit-and-go/chip-value-independent-icm-model/
- https://www.icmizer.com/en/blog/progressive-knockout-strategy/
