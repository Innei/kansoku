import type { RouteRegistry } from './routing/RouteRegistry';

export function configureRoutes(routes: RouteRegistry): void {
  routes.addPublicRoutes();
}
