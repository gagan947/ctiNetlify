import { CanDeactivateFn } from '@angular/router';
export interface CanComponentDeactivate {
  canDeactivate: () => boolean | Promise<boolean>;
}
export const canDeactivateGuard: CanDeactivateFn<CanComponentDeactivate> =

  (component, _currentRoute, _currentState, nextState) => {
    if (!nextState) return true;
    const nextUrl = nextState.url;
    console.log('nextUrl', nextUrl);
    const triggerRoutes = ['/dashboard', '/profile', '/logout', '/', '/main'];
    // Only trigger canDeactivate if the next route is in triggerRoutes
    if (triggerRoutes.includes(nextUrl)) {
      return component.canDeactivate ? component.canDeactivate() : true;
    }

    // Otherwise, allow navigation without confirmation
    return true;
  };
