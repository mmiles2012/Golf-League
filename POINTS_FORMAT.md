# Points Scoring Format Guide

This document describes the required format for configuring and importing points scoring tables in the Hideout Golf League system.

---

## Overview
Points scoring tables define how many points are awarded to each finishing position in a tournament. The system supports separate tables for each tournament type:
- **Major**
- **Tour**
- **League**
- **SUPR Club**

Each table is an ordered list of objects, where each object specifies a `position` (1-based) and the `points` awarded for that position.

---

## JSON Format Example
The points configuration must be a JSON object with the following structure:

```json
{
  "major": [
    { "position": 1, "points": 750 },
    { "position": 2, "points": 400 },
    { "position": 3, "points": 350 },
    // ...
  ],
  "tour": [
    { "position": 1, "points": 500 },
    { "position": 2, "points": 300 },
    // ...
  ],
  "league": [
    { "position": 1, "points": 93.75 },
    { "position": 2, "points": 50 },
    // ...
  ],
  "supr": [
    { "position": 1, "points": 93.75 },
    { "position": 2, "points": 50 },
    // ...
  ]
}
```

- Each array must be ordered by `position` ascending.
- `position` must be a positive integer (1-based).
- `points` must be a number (integer or decimal).

---

## Import/Upload Requirements
- The JSON must include all four keys: `major`, `tour`, `league`, `supr`.
- Each key must map to an array of `{ position, points }` objects.
- The number of positions can vary by tournament type, but should match the intended scoring system.
- No duplicate positions are allowed within a type.
- All positions should be consecutive (no gaps).

---

## Example (Partial)
```json
{
  "major": [
    { "position": 1, "points": 750 },
    { "position": 2, "points": 400 },
    { "position": 3, "points": 350 }
  ],
  "tour": [
    { "position": 1, "points": 500 },
    { "position": 2, "points": 300 }
  ],
  "league": [
    { "position": 1, "points": 93.75 },
    { "position": 2, "points": 50 }
  ],
  "supr": [
    { "position": 1, "points": 93.75 },
    { "position": 2, "points": 50 }
  ]
}
```

---

## Editing Points in the App
- Admins can edit the points table for each tournament type via the Points Configuration page.
- Changes are saved and applied to future tournaments and recalculations.

---

## Validation
- The system will reject configurations that are missing required keys, have invalid types, or contain duplicate/non-consecutive positions.
- Points values must be valid numbers.

---

## Tips
- Use a spreadsheet to prepare your points tables, then export to CSV/JSON and convert as needed.
- Always back up your current configuration before making changes.

---

For further details, see the README or contact the system administrator.
