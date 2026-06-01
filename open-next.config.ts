import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext Cloudflare build config. Minimal for now: the app runs on the
// Workers Node.js runtime with no incremental cache override.
//
// When you create the R2 bucket (see wrangler.jsonc), switch the cache on:
//   import r2IncrementalCache from
//     "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
//   export default defineCloudflareConfig({ incrementalCache: r2IncrementalCache });
export default defineCloudflareConfig({});
