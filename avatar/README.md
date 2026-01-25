# avatar

Adopted from [Tangled's avatar service](https://tangled.org/tangled.org/core/tree/master/avatar).

This is a small service that fetches your pretty Bluesky avatar and caches it on Cloudflare. It uses a shared secret `AVATAR_SHARED_SECRET` to ensure requests only originate from the trusted appview.

It's deployed using `wrangler` like so:

```bash
npx wrangler deploy
npx wrangler secrets put AVATAR_SHARED_SECRET
```
