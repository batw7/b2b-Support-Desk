import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '@app/services/auth.service';

export const roleGuard = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  let r: ActivatedRouteSnapshot | null = route;
  let roles: string[] | undefined;
  while (r) {
    if (r.data['roles']) { roles = r.data['roles']; break; }
    r = r.parent;
  }
  if (!roles?.length) return true;
  const user = auth.getCurrentUser();
  if (!user) {
    router.navigate(['/login']);
    return false;
  }
  if (roles.includes(user.role)) return true;
  router.navigate(['/dashboard']);
  return false;
};
