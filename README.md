# Lightkeeper

A catalogue of US lighthouses: a map, a short sourced history of each one, where its keepers' logs and journals are held, links to public sites about it, and booking details for lighthouses and keeper's quarters that offer overnight stays.

## Data rules

- Every fact, history and booking link cites a source in `data/lighthouses.json`, with the date it was read.
- Nothing is written from memory. If a source doesn't say it, it isn't in the data.
- Copyrighted sites (Lighthouse Digest, Lighthouse Friends and similar) are linked, not copied.
- Booking details change. Each stay carries a `checked` date so stale links can be found and rechecked.

`npm run validate` checks the data (coordinates, source ids, https links, dates) and runs before every build.

## Development

```sh
npm install
npm run dev      # local dev server
npm run build    # validate data, type-check, build to dist/
```

## Deployment

`.github/workflows/deploy.yml` builds every pull request and deploys `main` to GitHub Pages. In the repository settings, Pages must be set to deploy from **GitHub Actions**.

## Stack

Vite, React, TypeScript, Leaflet with OpenStreetMap tiles. Data lives as versioned JSON in `data/`.
