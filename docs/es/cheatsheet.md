[English](../cheatsheet.md) · **Español**

# Chuleta

## El ciclo

`/start` → un paso → `/handoff` → `/clear` → repetir. **Un paso por sesión.**

## Qué usar y cuándo

| Momento | Escribe | Qué pasa |
|---|---|---|
| Abres Claude Code | `/start` | Lee las reglas, el progreso y git; informa en 5 líneas; comprueba que la guarda está viva; espera |
| El paso está hecho, o el contexto pasa del ~60 % | `/handoff` | Comprobaciones, `PROGRESS.md` al día, commit y push (te pregunta antes) |
| Justo después de `/handoff` | `/clear` | Contexto limpio. No se pierde nada del repo |
| Claude va a hacer algo que no le pediste | `Esc` | Lo para. Después dile lo que quieres |

Los comandos viven en `.claude/commands/`. Si tu proyecto no los tiene, estos son los prompts, listos para
pegar:

**`/start`**
```text
Lee CLAUDE.md, PROGRESS.md (sobre todo la sección HANDOFF), git status y git log -5. No modifiques nada
todavía. Resume en 5 líneas dónde estamos, qué harás a continuación y cualquier inconsistencia entre
PROGRESS.md y el repositorio. Espera mi aprobación.
```

**`/handoff`**
```text
Cambiamos de paso. No empieces trabajo nuevo. 1) Termina el subpaso a medias si es corto; si no, deshazlo y
dilo. 2) Ejecuta todas las comprobaciones e informa del resultado real. 3) Actualiza la sección HANDOFF de
PROGRESS.md: paso, qué se terminó, qué queda con la siguiente acción concreta, archivos tocados, decisiones,
dudas abiertas, comprobaciones y riesgos. 4) Haz el commit (en wip/step-N si las comprobaciones fallan).
5) Enséñame git status y el commit. 6) Haz el push.
```

## ¿Cuánto contexto llevas?

Escribe `/context` para verlo. Regla práctica:

| Contexto usado | Haz esto |
|---|---|
| menos del 40 % | Sigue |
| 40–60 % | Termina la pieza actual; nada de tareas grandes nuevas |
| más del 60 % | `/handoff` ya, apunta la parte en la que vas («paso 7, parte 2 de 3»), `/clear` y sigue en limpio |

## Cinco hábitos

1. **Un paso por sesión**, con su propio prompt.
2. **Pide la prueba primero**: «añade la prueba y enséñame que falla», y después el arreglo.
3. **Ante la duda, para**: dile a Claude que se pare y pregunte en vez de adivinar.
4. **Nunca pegues secretos** en el chat ni en archivos que no estén ignorados.
5. **Lee el diff** antes de aceptar un commit: `git diff`.

Más: [Prompts que funcionaron](../prompt-patterns.md) (en inglés) · [Museo de errores](mistakes-museum.md) · [Level 2 — Training Wheels](../level-2.md) (en inglés)
