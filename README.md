# Action Runner

A Visual Studio Code extension that lets you **define and run custom actions** — scripts, commands, or executables — directly from VS Code.

Each action is described in a JSON configuration file and can be launched with a single click.

---

## Example configuration

```json
{
    "<action id>": {
        "name": "<action name>",
        "type": "<action_type>",
        "description": "<action description>",
        "path": "<action path>",
        "args": []
    }
}
```
**Available action types:**
`python`, `bash`, `bat`, `exe`, `bin`, `text`

---

## VS Code variable substitution

Action Runner automatically resolves common VS Code variables in your arguments:

| Variable               | Description                              |
| ---------------------- | ---------------------------------------- |
| `${workspaceFolder}`   | The root folder of the current workspace |
| `${file}`              | Full path of the currently opened file   |
| `${fileDirname}`       | Directory of the current file            |
| `${fileBasename}`      | File name with extension                 |
| `${fileExtname}`       | File extension (e.g. `.py`, `.cpp`)      |
| `${fileBasenameNoExt}` | File name without extension              |

---
