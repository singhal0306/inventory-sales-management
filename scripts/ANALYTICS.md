# Sales reports

The analytics page fetches reports through `analyticsAction.js` and stores results, request status, and export status in `analyticsSlice.js`. Request IDs prevent older responses from replacing newer filters. Logging out clears analytics state.

Protected endpoints:

- `GET /api/analytics/sales`
- `GET /api/analytics/sales/export`

Parameters: `from` and `to` in `YYYY-MM-DD`, or `allTime=true`; optional `search`, `sort` (`sales`, `quantity`, `name`, `lastSale`, `stock`), and positive integer `page`. Product search and sorting affect only product rows. Results use 20 products per page. CSV includes summary, trend, and all matching products regardless of pagination.

Dates use Asia/Kolkata. End dates include the full day unless the day is today, when results stop at generation time. Comparisons use the preceding equal-length calendar period, truncated to the same elapsed duration when today is included. All-time reports begin with the earliest dated bill and have no previous-period comparison. Trends use daily buckets up to 90 days, monthly buckets for longer ranges, and include zero-sales periods.

Sales before additions sum stored line amounts. Billed totals sum stored bill totals. Additions are their difference rather than a reconstructed tax amount. Average bill uses billed total divided by bill count. No profit, payment collection, or tax compliance calculation is implied.

Products include the current catalog (including archived and unsold products) plus sales references whose items are unavailable. Current stock is not stock at the report end date. Last sale and distinct bill counts are limited to the selected range. Share uses total period sales before additions, even when product rows are searched. Product names and manufacturers come from current inventory records, not historical snapshots. Bills missing `createdAt` cannot be assigned to a period and are excluded.

Reports and exports query current data when requested; an export can reflect changes made since the screen was generated. A `createdAt` index is declared on the Bill schema. Aggregations run on the server; product metadata is merged, sorted, and paginated in server memory. Very large catalogs may need database-side pagination or a reporting collection later.

Manual verification scenarios (not executed): empty database; an unsold product; archived products; duplicate lines for one product on one bill; sales just before and after IST midnight; custom month boundaries; zero previous sales; all-time sales older than six months; product search with CSV beyond page 1; fast filter changes; invalid ranges and unauthenticated API requests. Summary line sales should reconcile with product sales and trend sales before rounding; billed totals should reconcile with trend billed totals.
