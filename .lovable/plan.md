# SEC lead sourcing completeness and scrolling fixes

## Changes

- Adjust the SEC pagination loop so searches with a city continue through the available raw result set up to the existing safety limit, even after enough matches exist to fill the requested result count.
- Preserve the current early-stop behavior for searches without a city.
- Return a separate post-filter match total and use it in the results heading, while still returning only the requested number of rows.
- Fix the results area’s vertical overflow within the existing employee page shell so every returned row can be reached, without changing unrelated page sections.

## Verification

- Run the TypeScript check and targeted lint/check commands.
- Deploy the updated search function and run a basic live search.
- Open the lead sourcing page at desktop and mobile-sized viewports, populate enough rows to overflow, and verify scrolling reaches the final row.

## Technical details

- The SEC endpoint total remains useful as the upstream pre-city-filter count; the new match total represents matches discovered during the completed city walk.
- City searches remain bounded by the existing `maxRawRecords` and hard page cap, so “actual matches” means all matches found within that explicitly budgeted walk.
