# Dayline visual system — Line of Day + Soft Studio

**Date:** 2026-08-19  
**Status:** Approved  
**Mix:** ~80% Line of Day, ~20% Soft Studio tactility

## Personality

A living personal day. Not editorial SaaS. Cooler paper, semantic accents, compact icons, time as the interface.

## Architecture

- Tokens and CVA variants own color/shape. Pages do not invent palettes.
- `DaylineIcon` is the only Lucide import surface.
- `DaySpine` owns PAST → NOW → CURRENT → NEXT → gaps → LATER.
- Running work is positioned at NOW, not at its original scheduled slot.
- Motion explains start / complete / drop. CSS handles hover.
- dnd-kit wraps drag; Today does not use HTML5 `draggable` as the primary path.
- Companion is presentational; `day-view` still owns when it appears.

## Out

Detached Current banner. Beige editorial serif hero. Database timestamps. New product features. Dexie/Radix/RHF in this pass.
