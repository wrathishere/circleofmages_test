# Circle of Mages Progression Viewer

Static dark-fantasy progression UI powered by Google Sheets.

## Google Sheets source

The frontend reads CSV data from this spreadsheet ID:

`1FFEg75S6-HKlN58pMROvtTkBry1FYGrVruPsUbaf4qA`

Expected tabs:

- `ranks` — rank name, rank description/lore/rewards, `req1` through `req4`, and matching `req# description` columns.
- `reqs` — master requirement registry with `name`, `type`, and `description` columns.
- `tracker` — player rows with `Player Name`, `Ranking`, `Influence Points`, and one TRUE/FALSE completion column per requirement.
- `nodelayout` — `name`, percentage `x`, percentage `y`, and icon filename in `icon`.
- `connections` — optional path data with `from` and `to` rank names. If absent, the app falls back to row-order connections.

## Rank icons

Rank icons live in `images/ranks/`. The `nodelayout.icon` value is loaded as `images/ranks/{icon}`. Missing icons fall back to `images/ranks/default.png`.
