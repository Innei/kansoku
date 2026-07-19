# Pro 文件 Overlay POC

这个包验证同目录 `foo.ts` / `foo.pro.ts` 的构建期选择机制。

- `foo.ts` 是公开仓库中的 OSS 实现。
- `foo.pro.ts` 是本地软链接，真实文件位于 `apps/pro/overlays`。
- Vite 与 tsdown 共用 `proOverlayPlugin`，Pro 模式优先解析软链接。
- TypeScript 的 Pro 配置使用 `moduleSuffixes: [".pro", ""]`。
- `scripts/sync.mjs` 根据 Pro 仓库中的镜像路径创建和校验软链接。

完整验证由 Pro 仓库执行：

```bash
pnpm --filter @kansoku/pro poc:overlay
```

该命令分别构建 OSS 和 Pro 图，检查 OOP 子类选择结果，然后把 Pro 的单文件构建产物封装成一个 `pro.enc` 并解密回读验证。
