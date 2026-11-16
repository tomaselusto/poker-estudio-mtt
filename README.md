# Poker Estudio v4.1 — Vanilla, KO y PKO (beta educativa)

Se conserva el visor 6-max/8-max y las calculadoras de la v4. Se agrega:

- Selector global **Vanilla / KO / PKO**, persistente por `localStorage`.
- Pestaña **Bounty / KO**, con un escenario heads-up de call a all-in, stacks y verificación de cobertura.
- Cálculo de **Bounty Power** desde fichas expresadas en BB y pools de premios/recompensas pendientes, o con factor manual.
- KO fijo: cobra recompensa completa al eliminar. PKO: permite cambiar fracción cobrada inmediatamente y diferencia el monto que pasa a la cabeza de Hero.
- Comparativa Vanilla vs KO vs PKO del **umbral de equity** y del **EV de call** en un escenario donde Hero puede eliminar al rival.
- Integración: botón que importa equity de la calculadora existente, separando probabilidades de victoria y empate.
- Al elegir KO o PKO, los rangos preflop existentes permanecen como referencias **Vanilla chip EV** y aparece una advertencia global. **NO son tablas solver KO/PKO.**
- Caché PWA actualizado para la nueva versión.

## Fórmulas y límites

- Bounty Power (aproximación cEV): fichas en juego expresadas en BB / (premios regulares pendientes + bounty pool pendiente).
- Bonus cobrable (en BB): bounty inmediato × Bounty Power, si Hero puede eliminar al rival.
- Equity mínima **sin empates**: `call / (pozo disputable después del call + bonus BB)`; el pozo no incluye fichas no igualadas.
- EV simplificado (con empates contabilizados correctamente): `equity_de_pozo × pozo_tras_call − call + P(ganar_sin_empatar) × bonus_BB`.
- El aumento del propio bounty en PKO NO es efectivo cobrado inmediatamente, ni se valora como dinero en este modelo. No incluye el valor futuro de la recompensa, ICM, múltiples oponentes, cobertura parcial ni estrategia óptima.
- Los inputs precargados son **un ejemplo didáctico**.

## Deploy / Render

Actualizá el contenido completo de `public/` en el repositorio existente; conservá `render.yaml` en la raíz. Hacé commit y push a `main`. Render Static Site, Publish Directory `public`.

## Pruebas matemáticas de referencia

Escenario de ejemplo: pozo disputable antes del call 15.5 BB, call 12 BB, equity 36%, Hero 25 BB vs Rival 12 BB, bounty 10, Bounty Power 1 BB/$, PKO 50% inmediato:

- Vanilla: equity necesaria 43.64%, EV = −2.10 BB.
- KO: equity necesaria 32%, EV = +1.50 BB.
- PKO: equity necesaria 36.92%, EV = −0.30 BB (no se valora la transferencia progresiva).

Si Hero **no cubre** al rival, los tres modos generan el mismo umbral directo de equity y el bounty no contribuye al EV inmediato.

Fuentes conceptuales: https://blog.gtowizard.com/bringing-it-all-together-pko-review/ y https://blog.gtowizard.com/bounty-models-explained-solving-knockout-tournaments/.
