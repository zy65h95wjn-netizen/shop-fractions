# Sprite catalog updates

The `Refresh sprite catalog` workflow checks every six hours (00:23, 06:23,
12:23, 18:23 UTC), on updater changes, and via Run workflow. It uses only the
repository-scoped GITHUB_TOKEN with contents write; no personal token or paid
service is required. Source: https://www.fnsprites.info/ factual public season
catalog and release flags. This is a community feed, not an Epic API.

Run `python3 scripts/sync_sprites.py` from a checkout to refresh. Run
`python3 -m unittest discover -s scripts -p 'test_sync_sprites.py'` to test.
Upstream JavaScript is parsed as literal data, never executed. Duplicate IDs,
malformed schemas, disappearance of known entries, major release rollbacks,
and network errors fail before any replacement is written. Unreleased entries
are not imported. New discoveries use the first successful check date; that
is not a guaranteed historical release date. Existing IDs and dates are kept.

The app loads the newest valid catalog from raw.githubusercontent.com, Pages,
or its device cache. Direct raw access is intentional: GITHUB_TOKEN commits
do not trigger Pages builds. The app shows its last successful check and a
warning after 24 hours without a valid check. Reopening after 15 minutes or
using Refresh requests current data. Catches stay in the existing `isl.sprites`
localStorage key; no personal collection data is sent to the feed or GitHub.
Older seasons are retained under Past collection and count toward the jar.

Review failed runs in Actions; no failure may be represented as a successful
check. To stop updates, disable the workflow. To roll back bad data, revert
only the catalog commit and disable the workflow while investigating. The
browser normally prefers newer checked data, so publish a corrected catalog
with a new lastChecked timestamp after reviewing a rollback. Never reset saves.

The event calendar is separately curated from Epic's announcement. Dates are
release windows, not promises of a particular sprite. The old Thursday rule
has been removed. Future event calendars still require verified updates.

Card abilities and finding instructions are reviewed separately in
`sprite-details.json`. The updater applies these family facts to every finish
on every run, including entries already present in the catalog. Variant bonuses
are applied to the matching groups. New families require factual review before
this file is extended; the release feed alone does not verify their abilities.
The review date and source URLs are included with the resulting card metadata.
Do not replace reviewed abilities with feed placeholders during a release sync.
