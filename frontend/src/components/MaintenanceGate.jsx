import {
LoaderCircle,
RefreshCw,
ShieldCheck,
Wrench,
} from 'lucide-react';

import {
Link,
useLocation,
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { usePlatformSettings } from '../context/PlatformSettingsContext';

const MAINTENANCE_ALLOWED_PATHS = new Set([
'/login',
'/login/student',
'/login/employer',
'/internal/access',
'/forgot-password',
'/reset-password',
'/verify-email',
'/auth/callback',
'/unauthorized',
'/account-suspended',
]);

function isAllowedDuringMaintenance(pathname) {
if (
MAINTENANCE_ALLOWED_PATHS.has(
pathname
)
) {
return true;
}

return pathname.startsWith('/auth/');
}

function FullPageLoader() {
return ( <div className="grid min-h-screen place-items-center bg-slate-50 px-6 dark:bg-slate-950"> <div className="text-center"> <LoaderCircle
       className="mx-auto animate-spin text-brand-600"
       size={38}
     />


    <p className="mt-4 text-sm font-semibold text-slate-500">
      Loading InternNext…
    </p>
  </div>
</div>


);
}

function MaintenanceScreen({
platformName,
supportEmail,
onRefresh,
}) {
return ( <main className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 px-5 py-12 text-white"> <section className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-white/10 p-7 text-center shadow-2xl backdrop-blur-xl sm:p-10"> <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-amber-400/15 text-amber-300"> <Wrench size={31} /> </div>


    <p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-brand-200">
      Scheduled maintenance
    </p>

    <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
      {platformName} will be back shortly
    </h1>

    <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
      The platform is currently undergoing maintenance.
      Existing data remains safe, but normal user access is
      temporarily unavailable.
    </p>

    {supportEmail && (
      <p className="mt-5 text-sm text-slate-300">
        Need assistance?{' '}
        <a
          href={'mailto:' + supportEmail}
          className="font-bold text-white underline underline-offset-4"
        >
          {supportEmail}
        </a>
      </p>
    )}

    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100"
      >
        <RefreshCw size={17} />
        Check again
      </button>

      <Link
        to="/internal/access"
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
      >
        <ShieldCheck size={17} />
        Operations access
      </Link>
    </div>
  </section>
</main>


);
}

function MaintenanceGate({
children,
}) {
const location = useLocation();

const {
profile,
loading: authLoading,
} = useAuth();

const {
settings,
loading: settingsLoading,
refreshSettings,
} = usePlatformSettings();

if (
authLoading ||
settingsLoading
) {
return <FullPageLoader />;
}

const isAdmin =
profile?.role === 'admin';

const routeIsAllowed =
isAllowedDuringMaintenance(
location.pathname
);

if (
!settings.maintenance_mode ||
isAdmin ||
routeIsAllowed
) {
return children;
}

return (
<MaintenanceScreen
platformName={
settings.platform_name ||
'InternNext'
}
supportEmail={
settings.support_email
}
onRefresh={() =>
refreshSettings()
}
/>
);
}

export { MaintenanceGate };
