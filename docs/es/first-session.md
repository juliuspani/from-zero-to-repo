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
✅ `npm test` termina con `fail 0`; Dr. Repo dice `Score: 10/10`. (Windows: si PowerShell dice que *la ejecución de
scripts está deshabilitada*, mira [la tabla del final](#si-ves-este-error).)

**7. Instala Claude Code y ábrelo en el proyecto.** *El agente, dentro de tu carpeta.*
Necesitas un plan de pago de Claude: el plan gratuito no incluye Claude Code ([precios oficiales](https://claude.com/pricing)).
Instálalo con el comando oficial de tu sistema, copiado de [la instalación oficial](https://code.claude.com/docs/en/setup):

Windows (PowerShell):

```powershell
irm https://claude.ai/install.ps1 | iex
```

macOS y Linux:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

No muestra progreso mientras descarga: espera a que vuelva el prompt. Después **abre una terminal nueva** (la que
usaste para instalar aún no conoce el programa) y comprueba:

```bash
claude --version
```
✅ Muestra un número de versión. ¿«No se reconoce» o «command not found»? Mira [la tabla del final](#si-ves-este-error).

Después, en la terminal nueva y dentro de `mi-primer-proyecto`:

```bash
claude
```
✅ La primera vez abre el navegador para que inicies sesión en tu cuenta de Claude. Después te pregunta si confías
en esta carpeta. Di que sí: es tuya.

> **¿Prefieres una app?** La [app de escritorio de Claude](https://code.claude.com/docs/en/desktop-quickstart) usa
> Claude Code sin terminal. Esta guía usa la terminal, para que cada paso sea igual en Windows, macOS y Linux.

**8. Empieza la sesión y dale un primer paso.** *Un cambio pequeño y real.*
Escribe `/start`. Claude resume dónde está el proyecto y comprueba que el hook de guarda está vivo (debe
informar de una lectura de prueba **BLOCKED**). También verá que `CLAUDE.md` y `PROGRESS.md` aún tienen
`<placeholders>`: es normal el primer día, y `/handoff` rellena `PROGRESS.md` por ti. Después pega el primer
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
Escribe `/handoff`. Claude ejecuta las comprobaciones, actualiza `PROGRESS.md`, hace el commit y el push. El
push te pide permiso: es la red de seguridad funcionando, di que sí.

✅ `git status` dice "nothing to commit, working tree clean".

**10. Míralo en línea y limpia.** *Tu primer push, publicado.*

```bash
gh repo view --web
```
✅ Tu commit está en GitHub. De vuelta en Claude Code, escribe `/clear`. La próxima vez: `/start` y el paso
siguiente.

🎉 Ya está: un proyecto real, con su historia, en línea y seguro.

---

## Si ves este error…

| Ves | Qué significa | Arreglo |
|---|---|---|
| `Author identity unknown` / `Please tell me who you are` | git no sabe tu nombre ni tu email | Paso 3 |
| `GH007: Your push would publish a private email address` | tus commits usan tu email real | [Museo 5](mistakes-museum.md#the-push-that-github-refused) |
| `'git'`, `'node'` o `'gh'` no se reconoce como nombre de un cmdlet / command not found | la terminal se abrió antes de la instalación | Ciérrala y abre una nueva |
| `El término 'claude' no se reconoce como nombre de un cmdlet…` / `command not found: claude` | la terminal se abrió antes de la instalación, o la carpeta de instalación no está en tu PATH | Cierra **todas** las ventanas de terminal y abre una nueva. ¿Sigue en Windows? [Dos comandos lo arreglan](#claude-sigue-sin-reconocerse-en-windows). Guía oficial: [Fix your PATH](https://code.claude.com/docs/en/troubleshoot-install#command-not-found-claude-after-installation). [Museo 10](mistakes-museum.md#the-terminal-that-did-not-know-claude) |
| Un archivo de configuración «se ve bien» pero dice que no es válido | un BOM invisible de Word o de PowerShell | [Museo 3](mistakes-museum.md#the-word-file-with-an-invisible-character) |
| Parece que tus ajustes se ignoran | el archivo es `settings.json.txt` | [Museo 4](mistakes-museum.md#the-settings-file-that-was-a-txt) |
| `BLOCKED by .claude/hooks/guard.mjs: the guardrails … are edited by a human` | Claude intentó cambiar sus propias reglas | Edita tú el archivo en un editor de texto: [Museo 1](mistakes-museum.md#the-agent-that-tried-to-edit-its-own-rules) |
| Claude se repite, olvida decisiones o dice que el contexto está casi lleno | la sesión es demasiado larga | `/handoff`, `/clear`, `/start`: [Museo 6](mistakes-museum.md#the-session-that-forgot-everything) |
| `No se puede cargar el archivo …npm.ps1 porque la ejecución de scripts está deshabilitada en este sistema` | Windows PowerShell no ejecuta archivos de script por defecto, y `npm` es uno | Escribe `npm.cmd` en lugar de `npm`: `npm.cmd test`, `npm.cmd run dr-repo` |
| `npm test` falla | una comprobación encontró un problema real | Pega las líneas que fallan a Claude y pídele que lo explique antes de arreglarlo |

### claude sigue sin reconocerse en Windows

El instalador pone `claude.exe` en `.local\bin`, dentro de tu carpeta de usuario. Comprueba que está:

```powershell
Test-Path "$HOME\.local\bin\claude.exe"
```

`True`: añade esa carpeta al PATH de tu usuario, una sola vez:

```powershell
[Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path","User") + ";$HOME\.local\bin", "User")
```

Después cierra todas las ventanas de terminal, abre una nueva y ejecuta `claude --version`. `False`: la instalación no
terminó; vuelve a ejecutar el comando de instalación del paso 7. `npm run dr-repo` también te avisa cuando `claude` no
está en tu PATH.

¿Atascado en otra cosa? [Abre una issue](../../../../issues): las preguntas de principiante son bienvenidas.
