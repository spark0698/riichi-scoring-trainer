# Riichi Scoring Trainer

A browser-based trainer for practicing riichi mahjong hand scoring: read a dealt hand, name the yaku, count the han and fu, and call the score.

## Features

- **Score practice** — deals a random hand (with configurable rules and filters for win method, seat, and which fields you're quizzed on) and checks your han/fu/points answer against the correct score.
- **Mistakes review** — hands you scored incorrectly are saved so you can look back at them, and replay just those hands to retry.
- **Japanese terms flashcards** — study riichi terminology, filterable down to just the categories you want to practice.
- **Reference material** — yaku list, fu calculation breakdown, and a han+fu → points lookup table, all available from the menu.

## Running locally

This is a static site with no build step. Serve the directory with any static file server, e.g.:

```
python3 -m http.server 8000
```

then open `http://localhost:8000/`.

## Credit

Heavily inspired by [scoringtrainer.konbamwa.net](https://scoringtrainer.konbamwa.net/).
