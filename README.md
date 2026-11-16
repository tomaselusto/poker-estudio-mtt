# Poker Estudio v4.3 — Constructor de rangos por EV estimado (KO/PKO)

Incluye **todo el laboratorio anterior** (RFI 6-max/8-max, equity, combinatoria, odds, bounty, análisis de call / reshove) y agrega una comparación completa entre rangos de **Vanilla, KO y PKO** usando **las mismas muestras de equity**.

## Cómo utilizar

1. Elegí 6-max u 8-max, modalidad y abrí **Decisiones KO/PKO**.
2. Indicá *call vs shove* o *reshove vs open*; los stacks, costo del call o tamaño de la apuesta, pozo y cobertura.
3. Cargá un **rango de shove rival** para call o el **rango con que el rival paga el reshove**. La frecuencia de fold al reshove debe ser coherente con ese rango.
4. Configurá la recompensa (en KO: totalidad del bounty; en PKO: porción inmediata) y conversión Bounty Power.
5. Pulsá **Calcular matriz completa** para una exploración de 169 clases de manos (480 muestras por clase); seleccioná una mano y refiná a 14.000 muestras, o usá **Refinar fronterizas** (máximo 25 clases, 4.000 muestras cada una).
6. En **Matriz y recomendación según modalidad** alterná Vanilla / KO / PKO, o compará diferencias KO→Vanilla y PKO→Vanilla. Las clases verdes pasan de EV negativo a positivo **según los supuestos**.
7. Copiá el rango favorable como texto o exportá un CSV con EV y equity de cada clase para las tres modalidades.

## Cómo interpretar

- **Verde:** EV de la acción mayor que cero con un margen estadístico aproximado de 95% (modelo condicional cEV heads-up).
- **Ámbar:** intervalo estadístico incluye EV=0; no implica mezcla GTO.
- **Rojo:** EV negativo respecto de fold, dentro de los supuestos.
- El % favorable es combinaciones (6 parejas, 4 suited, 12 offsuit) sobre **1326**, no porcentaje del RFI ni frecuencia óptima.
- En modo **diferencia**, verde exige EV Vanilla negativo y KO/PKO positivo con suficiente margen. Ámbar indica Vanilla fronterizo y KO/PKO positivo.
- En **reshove** se muestra también el fold mínimo estimado del rival para que el reshove alcance EV >= 0, usando el rango de call declarado.
- En **aislamiento** solo se muestra EV condicionado a quedar heads-up. **NO evalúa** a los jugadores restantes; no usar el resultado como recomendación completa de aislar.
- PKO **NO** monetiza automáticamente el bounty progresivo transferido a la propia cabeza.

**No es un solver GTO, no incluye ICM, dinámica completa de árboles, equity realization postflop, value de recompensas futuras ni distribución real de rivales.** No convierte una mano +cEV en una estrategia óptima. No usar software de ayuda en una mano en curso si las normas del torneo lo prohíben.

## Actualización en Render

Descomprimí el ZIP, copiá **todo el contenido de `public/`** al directorio `public/` del repositorio local que ya tenés, conservá `render.yaml`, y corré:

```bash
git add .
git commit -m "Poker Estudio v4.3 - rangos de call y reshove KO PKO"
git push origin main
```

Tipo de servicio: **Static Site**; `Publish Directory`: `public`. El caché PWA ya fue actualizado de versión.

### Comprobaciones

- Validación matemática con casos controlados: 169 clases/1326 combos, Vanilla–KO–PKO, no cobertura, empates, umbral de folds.
- JavaScript validado con `node --check`, estructura y archivos ZIP verificados.
- El navegador automatizado del entorno bloquea localhost y file:// por política, por lo que los tests de interacción real deberán hacerse en Chrome/Render. El HTML autónomo también permite probar el visor sin servidor.

## Fuentes

- https://blog.gtowizard.com/the-theory-of-progressive-knockout-tournaments/
- https://blog.gtowizard.com/bounty-models-explained-solving-knockout-tournaments/
