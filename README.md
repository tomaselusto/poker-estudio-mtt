# Poker Estudio v4.2 — Laboratorio MTT con análisis de decisión KO / PKO

**Sitio estático instalable (PWA), 6-max y 8-max.** Mantiene los módulos previos de rangos, pot odds, odds implícitas, equity, combinatoria, rango rival y bounty.

## Nuevo: «Decisiones KO/PKO»

- **Call vs. open shove, heads-up:** elegí stacks, posición, pozo disputable *antes del call*, costo real de call y rango de shove rival. Devuelve por clase de mano (169) una estimación de equity, EV chip EV del call con y sin bounty y umbral de equity.
- **Reshove vs. apertura, heads-up:** elegí stacks, monto de open, pozo muerto, frecuencia de fold al reshove y, de forma decisiva, **rango de call al reshove**. Calcula EV = P(fold) × ganancia sin showdown + P(call) × EV de showdown y bounty. La simplificación asume que Hero aún no invirtió ciegas, que nadie más interviene y que la inversión efectiva es min(stack Hero, stack Rival).
- **Aislar short:** estudia el EV *condicionado a quedar heads-up* cuando Hero cubre y va all-in sobre el shove. Si alguien detrás interviene hay un árbol multiway no calculado: **NO es EV total del aislamiento** ni una recomendación definitiva de shove.

## Interpretación de la matriz

- **Verde:** EV de la acción superior a fold según el modelo con margen de muestreo aproximado 95%.
- **Rojo:** EV inferior al fold según el mismo modelo.
- **Ámbar:** cerca del equilibrio o insuficiente certeza estadística; no implica automáticamente mezcla GTO.
- **Gris:** todavía sin evaluar.

La matriz completa usa aproximadamente **480 simulaciones por clase** y debe considerarse exploratoria, no precisa en decisiones marginales. Al tocar una casilla y seleccionar **«Refinar mano seleccionada»**, la clase se vuelve a simular con **14.000 muestras**. La comparación usa la equity de showdown, incluidos empates, e incorpora únicamente el bounty cobrado inmediatamente en caso de eliminación.

**Importante:** Los «rangos sugeridos» son hipótesis manuales de estudio según posición, stack y tipo de acción; **NO** son tablas solver GTO de KO/PKO. Los resultados dependen decisivamente de ese rango, de la fold equity y del bounty power. El rango de call al reshove es distinto del rango con el que el jugador hizo open.

## Bounty Power e ICM

El bounty monetario se convierte a BB usando el Bounty Power, que se puede importar del módulo «Bounty / KO»: total de fichas en juego expresadas en BB / (premios regulares pendientes + bounty pool pendiente), o valor manual.

- Vanilla: 0 bounty.
- KO: bounty completo únicamente si Hero puede eliminar al rival.
- PKO: solo porcentaje cobrado inmediatamente; **NO** se monetiza automáticamente la parte que aumenta el bounty de Hero.
- **No incorpora ICM, futuros bounties, flujos multiway, rake, ni resuelve equilibrio GTO.** Cerca de la burbuja o mesa final el modelo chip EV puede ofrecer decisiones distintas de una solución ICM completa.
- La banda ± de EV contempla **solo** el error de muestreo Monte Carlo, no la calidad del rango rival.
- Escenarios donde Hero ya aportó SB o BB necesitan contabilizar ese aporte correctamente; el modelo de reshove e aislamiento excluye Hero desde ciegas para evitar una contabilidad incorrecta.

Fuentes conceptuales:
- https://blog.gtowizard.com/the-theory-of-progressive-knockout-tournaments/
- https://blog.gtowizard.com/bounty-models-explained-solving-knockout-tournaments/

## Publicar sobre el sitio Render ya existente

1. Descomprimí este ZIP.
2. En tu repositorio local `poker-estudio-mtt` **reemplazá el contenido de `public/`** por el del ZIP; conservá `render.yaml` en la raíz.
3. En Git Bash, parado en la raíz del repositorio:

```bash
git add .
git commit -m "Poker Estudio v4.2 - analizador KO PKO por rangos"
git push origin main
```

Si Render tiene auto-deploy, publicará la actualización. En Render mantené el tipo **Static Site** y **Publish Directory = public**. No necesitás servidor backend.

## Pruebas efectuadas

- Pruebas unitarias de fórmulas: Vanilla, KO, PKO, reshove con frecuencia de fold, aislamiento condicional, empates, límites y verificación de quién cubre a quién.
- Validación de sintaxis de los scripts JavaScript y estructura HTML; comprobación de integridad ZIP.
- **Limitación de validación:** el navegador automatizado bloqueó los accesos file:// y localhost en este entorno; hay que realizar un smoke test de UX en Render/PC/celular (cambiar pestañas, calcular una mano, cambiar modalidad y usar el PWA offline).
