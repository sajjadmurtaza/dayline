# Dayline visual system (locked)

**Date:** 2026-08-19  
**Status:** Approved for implementation  
**Classification:** Presentation ownership. Domain, timers, planning, capture parse, routes, persistence unchanged.

## Ownership

| Fact                                                | Owner          |
| --------------------------------------------------- | -------------- |
| Time bands, notices, _when_ companion appears       | `day-view.ts`  |
| Spatial sequence PAST → NOW → CURRENT → NEXT → gaps | `buildSpine`   |
| Color and type                                      | CSS tokens     |
| Companion drawing                                   | `Daymark`      |
| Object surface (fixed/flexible/live/settled)        | `TimelineItem` |
| Adaptive context column                             | `TodayRail`    |
| Capture collapsed / typing / interpreted            | `QuickCapture` |
| Human copy                                          | next-intl      |

## Rules

- One continuous day. Spine threads through objects. Objects do not float as a dashboard.
- NOW is a full cut. Running work is the same object expanded on that cut.
- Gaps are spatial. No “180 min open”. Companion may say “Free until 2:00”.
- Capture is a well, not a search field.
- Calendar is Today at week zoom: duration blocks, same tones.
- Mobile: Capture, NOW, current or next, immediately.

## Out

New product features. Detached Current widget. Engine terminology in the UI. Beige editorial serif. Sparse text-on-a-line.
