[English](../mistakes-museum.md) · **Español**

# Museo de errores

Errores reales de construir un proyecto real con Claude Code, de un estudiante que nunca había usado git.
Cada ficha: **qué pasó · por qué · qué lo evita ahora · la prueba**. La prueba es un test que puedes ejecutar
con `npm test`, o la comprobación de [Dr. Repo](../../dr-repo.mjs) que lo detecta en tu propio proyecto.

¿Has visto un error que merece ficha? [Abre una issue](../../../../issues).

---

<a id="the-agent-that-tried-to-edit-its-own-rules"></a>
## 1. El agente que intentó editar sus propias reglas

**Qué pasó.** Le pedí a Claude que actualizara los permisos y los slash commands del proyecto. Claude Code se
negó: su propio clasificador de seguridad marcó la edición de `.claude/` como *automodificación*. Tuve que pegar
los cambios a mano.

**Por qué.** Los archivos de `.claude/` deciden qué puede hacer el agente. Un agente que puede reescribirlos
puede darse cualquier permiso. Molesto en el momento, pero el clasificador tenía razón.

**Qué lo evita ahora.** El hook de guarda y las reglas `deny` bloquean las escrituras de Claude en `.claude/settings*`,
`.claude/hooks/`, `.claude/commands/` y `.claude/agents/`, dentro de [los límites del hook](../level-2.md#limits) (en
inglés). Claude propone el cambio; tú lo pegas.

**Prueba.** `test/guard.test.mjs` → *"Claude may read its guardrails but never change them"*. Dr. Repo:
`guardrails-locked`.

---

<a id="the-review-that-broke-the-guard"></a>
## 2. La revisión que rompió la guarda

**Qué pasó.** Antes de publicar este mismo repositorio, un agente revisor de solo lectura auditó el hook de
guarda. Encontró que `git diff --output=.claude/hooks/guard.mjs` *sobrescribía el hook*, y el hook lo dejaba
pasar porque `git diff` «solo lee». También encontró `git commit -n` (se salta los hooks de git), `prod.env` y
`.envrc` (secretos con otros nombres) y `cd .claude && …` (una ruta que el hook nunca veía).

**Por qué.** Una regla que compara texto tiene agujeros con la forma de cada escritura en la que no pensaste.

**Qué lo evita ahora.** Cada hallazgo se convirtió primero en una prueba que fallaba, y después en el arreglo.
Cualquier comando de shell que mencione `.claude` tiene que ser un comando conocido de solo lectura, sin
opciones de salida.

**Prueba.** `test/guard.test.mjs` → las pruebas llamadas *S-01* a *S-12*. Dr. Repo: `claude-dir-locked`.

---

<a id="the-word-file-with-an-invisible-character"></a>
## 3. El archivo con un carácter invisible

**Qué pasó.** Edité un archivo de configuración en Word y lo guardé como UTF-8. Se veía perfecto. La herramienta
que lo leía decía que estaba roto.

**Por qué.** Algunos editores (Word, y `Set-Content -Encoding utf8` de Windows PowerShell 5.1) ponen al principio
del archivo una *marca de orden de bytes* (BOM) invisible. Los lectores de JSON y los hooks de git se atragantan
con ella.

**Qué lo evita ahora.** Edita el código y la configuración solo en un editor de texto plano (VS Code, Notepad++,
nano) y guarda como **UTF-8 sin BOM**. En VS Code, la barra de estado muestra la codificación; haz clic para
cambiarla.

**Prueba.** Dr. Repo marca como fallo `settings-safe` un `settings.json` que no puede leer ("not valid JSON").

---

<a id="the-settings-file-that-was-a-txt"></a>
## 4. El archivo de ajustes que era un .txt

**Qué pasó.** Creé `settings.json` con el Bloc de notas. Claude Code ignoró todas sus reglas.

**Por qué.** Windows oculta las extensiones de archivo por defecto. El archivo era en realidad
`settings.json.txt`.

**Qué lo evita ahora.** Activa las extensiones (Explorador de archivos → Vista → Mostrar → Extensiones de nombre
de archivo), o compruébalo con `ls .claude` (`dir .claude` en Windows).

**Prueba.** Dr. Repo: `settings-safe` informa de "settings saved as .txt". `test/dr-repo.test.mjs` planta uno.

---

<a id="the-push-that-github-refused"></a>
## 5. El push que GitHub rechazó

**Qué pasó.** Primer push de verdad. GitHub respondió `GH007: Your push would publish a private email address`.

**Por qué.** Había marcado "Keep my email addresses private" en GitHub, pero git firmaba mis commits con mi email
real. Cada commit lleva el email de su autor, para siempre, en público.

**Qué lo evita ahora.** Usa tu dirección *noreply* de GitHub (GitHub → Settings → Emails):
`git config --global user.email "<id>+<usuario>@users.noreply.github.com"`, y rehaz los commits que aún no
has subido (`git commit --amend --reset-author --no-edit` para el último).

**Prueba.** Dr. Repo: `git-email`.

---

<a id="the-session-that-forgot-everything"></a>
## 6. La sesión que lo olvidó todo

**Qué pasó.** Una sesión larga, muchas tareas. Hacia el final Claude empezó a repetir preguntas, a contradecir
decisiones anteriores, y el contexto se llenó a mitad de un cambio.

**Por qué.** El *contexto* de Claude (su memoria de trabajo en una conversación) es finito. Cuando se llena, los
detalles antiguos se resumen o se pierden, y la calidad baja antes de que se vea lleno.

**Qué lo evita ahora.** Un paso por sesión. Antes del ~60 % de contexto, ejecuta `/handoff`: escribe el estado en
`PROGRESS.md` y hace el commit. Después `/clear`, y `/start` en la sesión nueva.

**Prueba.** `test/method.test.mjs` → *"PROGRESS.md stays under 200 lines"*. Dr. Repo: `claude-md`, `progress-md`.

---

<a id="the-step-that-ran-too-early"></a>
## 7. El paso que empezó demasiado pronto

**Qué pasó.** Un paso empezó antes de que el anterior estuviera aprobado, y tuve que cortarlo a medias (`Esc`)
y deshacer la parte hecha.

**Por qué.** Sin una parada explícita, un agente con ganas sigue adelante: «y ahora lo siguiente…».

**Qué lo evita ahora.** El cierre estándar de `CLAUDE.md` termina cada paso con *para y espera la aprobación*, y
`/handoff` termina o deshace un subpaso a medias antes de nada.

**Prueba.** `CLAUDE.md` §3, y la sección HANDOFF que `test/method.test.mjs` exige en `PROGRESS.md`.

---

<a id="the-env-rule-that-blocked-the-wrong-file"></a>
## 8. La regla de .env que bloqueó el archivo equivocado

**Qué pasó.** Para alejar los secretos de Claude denegué `Read(./.env.*)`. También bloqueó `.env.example`, la
plantilla inofensiva que lista los *nombres* de las variables.

**Por qué.** Los comodines son glotones. Y los secretos también se esconden con otros nombres: `prod.env`, `.envrc`.

**Qué lo evita ahora.** `deny` lista las variantes habituales una a una; el hook bloquea además los otros nombres de
archivo de entorno que conoce (`.env.*`, `*.env`, `.envrc`) y solo permite `.env.example` con nombres y sin valores.
`.gitignore` ignora esos mismos nombres.

**Prueba.** `test/guard.test.mjs` → *"never reads or writes .env files, but allows names-only .env.example"*.
Dr. Repo: `env-ignored`, `env-tracked`, `secrets`.

---

<a id="the-hook-that-blocked-its-own-commit-message"></a>
## 9. El hook que bloqueó un mensaje de commit

**Qué pasó.** La guarda bloqueó un `git commit -m "…"` perfectamente inocente.

**Por qué.** El mensaje mencionaba una palabra prohibida (el nombre de un archivo `.env`). El hook lee el comando
entero como texto.

**Qué lo evita ahora.** Escribe los mensajes de commit largos en un archivo y usa `git commit -F mensaje.txt`. Una
falsa alarma sale barata; una alarma que falta, no.

**Prueba.** `test/guard.test.mjs` → *"never reads or writes .env files…"* (`cat .env` y compañía se bloquean por
el texto).

---

<a id="the-terminal-that-did-not-know-claude"></a>
## 10. Lo instalé, pero la terminal seguía sin conocer claude

**Qué pasó.** Solo había usado Claude Code desde la app de escritorio. En el paso 7, PowerShell respondió
`claude : El término 'claude' no se reconoce como nombre de un cmdlet…`. Lo instalé con el comando oficial, abrí una
terminal nueva y salió el mismo error. `claude.exe` estaba ahí, en `%USERPROFILE%\.local\bin`, pero esa carpeta no
estaba en mi PATH. Al añadirla al PATH de mi usuario y abrir una terminal nueva, `claude` arrancó.

**Por qué.** Una terminal encuentra los programas buscando en las carpetas que lista el PATH, y lee el PATH una sola
vez, al abrirse. El instalador pone `claude` en `.local\bin`, pero no siempre añade esa carpeta al PATH: escribe el
arreglo en sus notas finales, fáciles de pasar por alto porque el instalador no muestra progreso mientras trabaja.

**Qué lo evita ahora.** El paso 7 dice que abras una terminal nueva y compruebes con `claude --version` antes de
seguir, y [la tabla de errores](first-session.md#claude-sigue-sin-reconocerse-en-windows) da los dos comandos que
ponen `.local\bin` en el PATH de tu usuario. La app de escritorio no necesita nada de esto.

**Prueba.** Dr. Repo muestra un aviso, no un fallo, cuando ninguna carpeta del PATH tiene `claude`: `claude-on-path`.
`test/dr-repo.test.mjs` lo ejecuta con y sin un `claude` en el PATH, y comprueba que solo mira nombres de archivo.
