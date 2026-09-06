# Yahoo Pick'em Confidence Helper

This small Chrome extension makes an already-used confidence number explicit in
every other Yahoo Pick'em dropdown. A used option is renamed from, for example,
`3` to `3 — USED`, but remains selectable so Yahoo can move that value from the
previous game. The text marker is intentional: native macOS menus do not always
make option styling or disabled states obvious.

**[Download the ready-to-install ZIP](./yahoo-confidence-helper.zip)**

## Install the proof of concept

1. Download and unzip `yahoo-confidence-helper.zip`.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the unzipped `yahoo-confidence-helper` folder.
6. Reload the Yahoo Pick'em entry page.

## Expected behavior

- Pick a confidence value in one game.
- Open a different game's confidence menu.
- The chosen number should read `— USED` and should remain selectable.
- Changing or clearing the original choice should immediately free that number.
- If Yahoo restores a page with a duplicate value, both affected dropdowns get a
  red outline until the duplicate is resolved.

The extension does not save, transmit, or fetch anything. It has no background
process and runs only on:

`https://football.fantasysports.yahoo.com/pickem/*`

## Validation checklist on the live Yahoo page

Because Yahoo can change its markup, confirm these cases before relying on it:

1. Fresh week with no confidence values selected.
2. Select, change, and clear a confidence value.
3. Reload a partially completed week.
4. Switch between weeks without a full browser reload.
5. Verify Yahoo's **Save Picks** operation still sends the selected numeric values.
6. Verify locked/completed games remain untouched.

The script identifies confidence controls by their `1..N` option range and either
their nearby “Confidence Points” label or the presence of several identical game
dropdowns. This avoids depending on Yahoo's generated CSS class names.
