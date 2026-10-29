[English](../first-session.md) · **Español**

# Nivel 1: Tu primera sesión en 10 pasos

De no tener nada instalado a tu primer push, en más o menos una hora. Funciona en Windows, macOS y Linux:
escribe los comandos en una terminal (Windows: **PowerShell**; macOS: **Terminal**; Linux: la de siempre). Cada
paso dice para qué sirve, qué escribir y cómo saber que ha funcionado. ¿Palabras nuevas? Mira
[Empieza aquí](start-here.md).

Instalar herramientas es lo único que cambia con el tiempo, así que esos pasos enlazan a las instrucciones
oficiales en lugar de copiarlas.

---

**1. Instala git.** *Para que tu proyecto recuerde sus versiones.*
Windows: [git-scm.com/downloads/win](https://git-scm.com/downloads/win) · macOS: `xcode-select --install` ·
Linux (Debian/Ubuntu): `sudo apt install git`

```bash
git --version
```
✅ Muestra algo como `git version 2.x`.

**2. Instala Node.js (versión 20 o posterior).** *Las pruebas, Dr. Repo y el ejemplo funcionan con él.*
[nodejs.org](https://nodejs.org/) → el instalador **LTS**.

```bash
node --version
```
✅ Muestra `v20` o superior. Si dice que no lo encuentra, cierra la terminal y abre otra.

**3. Dile a git quién eres, con tu email privado de GitHub.** *Cada commit lleva este email, en público.*
Primero crea una cuenta gratuita en [github.com](https://github.com). Después copia tu dirección noreply desde
GitHub → Settings → Emails (tiene esta pinta: `12345+tu-usuario@users.noreply.github.com`) y marca
"Keep my email addresses private".

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "12345+tu-usuario@users.noreply.github.com"
```
✅ `git config --global user.email` muestra la dirección noreply. (Si te saltas esto, GitHub puede rechazar tu
push: [ficha 5 del museo](mistakes-museum.md#the-push-that-github-refused).)

**4. Instala la CLI de GitHub e inicia sesión.** *Para crear repos y hacer push sin contraseñas.*
[cli.github.com](https://cli.github.com/) → instálala, y después:

```bash
gh auth login
```
Elige GitHub.com, HTTPS y "Login with a web browser". ✅ `gh auth status` dice "Logged in".

**5. Crea tu proyecto a partir de esta plantilla.** *Tu propia copia, privada hasta que decidas otra cosa.*

```bash
gh repo create mi-primer-proyecto --template juliuspani/from-zero-to-repo --private --clone
cd mi-primer-proyecto
```
✅ `git log --oneline` muestra al menos un commit.

**6. Ejecuta las comprobaciones.** *La prueba de que todo funciona antes de que Claude toque nada.*

```bash
npm test
npm run dr-repo
```
✅ `npm test` termina con `fail 0`; Dr. Repo dice `Score: 10/10`.

**7. Instala Claude Code y ábrelo en el proyecto.** *El agente, dentro de tu carpeta.*
Sigue [la instalación oficial](https://docs.claude.com/en/docs/claude-code/setup) (necesitas una cuenta de
Claude) y, dentro de `mi-primer-proyecto`:

```bash
claude
```
✅ Claude Code arranca y te pregunta si confías en esta carpeta. Di que sí: es tuya.

**8. Empieza la sesión y dale un primer paso.** *Un cambio pequeño y real.*
Escribe `/arranque`. Claude resume dónde está el proyecto y comprueba que el hook de guarda está vivo (debe
informar de una lectura de prueba **BLOCKED**). También verá que `CLAUDE.md` y `PROGRESS.md` aún tienen
`<placeholders>`: es normal el primer día, y `/relevo` rellena `PROGRESS.md` por ti. Después pega el primer
paso del [ejemplo](../../examples/todo-cli/README.md), o esta misma versión en español:

```text
Paso 1: añade un comando "done <número>" a examples/todo-cli/todo.mjs que marque esa tarea como terminada.
- Escribe primero la prueba en examples/todo-cli/todo.test.mjs y enséñame que falla.
- Después haz que pase. Un número que no existe debe dar un error claro, no un fallo del programa.
- Ejecuta npm test. Solo pueden cambiar estos dos archivos.
- Cierra el paso como dice CLAUDE.md §3, y para. No empieces nada más.
```

✅ Claude te enseña una prueba que falla, después pasa, y se para a esperarte. `npm test` sigue terminando con
`fail 0`.

**9. Haz el relevo.** *Guardar el estado, hacer commit y push.*
Escribe `/relevo`. Claude ejecuta las comprobaciones, actualiza `PROGRESS.md`, hace el commit y el push. El
push te pide permiso: es la red de seguridad funcionando, di que sí.

✅ `git status` dice "nothing to commit, working tree clean".

**10. Míralo en línea y limpia.** *Tu primer push, publicado.*

```bash
gh repo view --web
```
✅ Tu commit está en GitHub. De vuelta en Claude Code, escribe `/clear`. La próxima vez: `/arranque` y el paso
siguiente.

🎉 Ya está: un proyecto real, con su historia, en línea y seguro.

---

## Si ves este error…

| Ves | Qué significa | Arreglo |
|---|---|---|
| `Author identity unknown` / `Please tell me who you are` | git no sabe tu nombre ni tu email | Paso 3 |
| `GH007: Your push would publish a private email address` | tus commits usan tu email real | [Museo 5](mistakes-museum.md#the-push-that-github-refused) |
| `'git'`, `'node'`, `'gh'` o `'claude'` no se reconoce como nombre de un cmdlet / command not found | la terminal se abrió antes de la instalación | Ciérrala y abre una nueva |
| Un archivo de configuración «se ve bien» pero dice que no es válido | un BOM invisible de Word o de PowerShell | [Museo 3](mistakes-museum.md#the-word-file-with-an-invisible-character) |
| Parece que tus ajustes se ignoran | el archivo es `settings.json.txt` | [Museo 4](mistakes-museum.md#the-settings-file-that-was-a-txt) |
| `BLOCKED by .claude/hooks/guard.mjs: the guardrails … are edited by a human` | Claude intentó cambiar sus propias reglas | Edita tú el archivo en un editor de texto: [Museo 1](mistakes-museum.md#the-agent-that-tried-to-edit-its-own-rules) |
| Claude se repite, olvida decisiones o dice que el contexto está casi lleno | la sesión es demasiado larga | `/relevo`, `/clear`, `/arranque`: [Museo 6](mistakes-museum.md#the-session-that-forgot-everything) |
| `npm test` falla | una comprobación encontró un problema real | Pega las líneas que fallan a Claude y pídele que lo explique antes de arreglarlo |

¿Atascado en otra cosa? [Abre una issue](../../../../issues): las preguntas de principiante son bienvenidas.
