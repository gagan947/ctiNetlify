import { CanDeactivateFn } from '@angular/router';
export interface CanComponentDeactivate {
  canDeactivate: () => boolean | Promise<boolean>;
}
export const canDeactivateGuard: CanDeactivateFn<CanComponentDeactivate> =

  (component, currentRoute, currentState, nextState) => {
    if (!nextState) return true;
    const nextUrl = nextState.url;
    const triggerRoutes = ['/dashboard', '/profile', '/logout'];
    if (triggerRoutes.includes(nextUrl)) return true;
 
    return component.canDeactivate ? component.canDeactivate() : true;
  };
