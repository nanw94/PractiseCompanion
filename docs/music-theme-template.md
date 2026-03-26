# Music theme — design kit & template

## Concept

- **Mood:** rehearsal room / concert programme — warm paper in light mode, dim hall in dark mode.
- **Motifs:** repeating **staff + notes** (`public/music-theme-pattern.svg`), subtle **instrument silhouettes** at low opacity.
- **Accents:** **burgundy** = primary actions; **gold** = eyebrow / highlights.

## Tokens

Set on `html.music-theme-root` in `app/music-theme.css`. Use in custom CSS:

```css
.my-panel {
  color: var(--music-ink);
  background: var(--music-surface);
  border: 1px solid var(--music-surface-border);
}
```

## Mantine

`lib/mantine-theme.ts` → `practiceMantineTheme` (`primaryColor: 'burgundy'`, extra `gold` scale).

## Components

| Utility | Use |
|---------|-----|
| `MusicPageShell` | Eyebrow + title + hint + `trailing` slot |
| `className="music-card"` | Mantine `Card` panels |
| `className="music-dropzone-card"` + `data-music-over` | Drag target |
| `className="music-draggable-tile"` | Draggable tiles |
| `music-app-brand` | App title in header |

## Example

See `app/routines/[id]/page.tsx` for a full page using `MusicPageShell` and the card classes.
