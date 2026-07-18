# @kansoku/license-worker

Cloudflare Worker，全代理客户端到 Dodo 的三个 license 端点（`/activate` `/validate` `/deactivate`），验证通过时下发解密 `pro.enc` 用的 `bundleKey` / `keyId`。设计见仓库根 `.superpowers/sdd/spec.md`「Cloudflare Worker（全代理）」一节。

## 环境变量

- `DODO_BASE_URL`：转发目标（`wrangler.jsonc` 里 live/test 环境各配一份，非 secret）。
- `BUNDLE_KEY` / `BUNDLE_KEY_ID`：`wrangler secret put` 写入，绝不入 git、不出现在 `wrangler.jsonc`。

## 节流的局限

节流状态存在 Worker isolate 的内存里（`src/throttle.ts`），不是全局一致的计数——同一 license 的请求分散到不同 isolate（不同地区 PoP、isolate 重启后）各算各的，是 best-effort 的粗粒度防刷，不是精确的速率限制。真要精确节流需要 Durable Object 或 KV，目前认为没必要。

## 本地开发 / 部署

```bash
pnpm --filter @kansoku/license-worker dev      # wrangler dev
pnpm --filter @kansoku/license-worker deploy   # wrangler deploy
pnpm --filter @kansoku/license-worker test
```
