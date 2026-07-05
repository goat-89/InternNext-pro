import {
createContext,
useCallback,
useContext,
useEffect,
useMemo,
useState,
} from 'react';

import {
getDefaultPublicPlatformSettings,
getPublicPlatformSettings,
} from '../lib/platformSettingsApi';

const PlatformSettingsContext =
createContext(null);

function usePlatformSettings() {
const context = useContext(
PlatformSettingsContext
);

if (!context) {
throw new Error(
'usePlatformSettings must be used inside PlatformSettingsProvider.'
);
}

return context;
}

function PlatformSettingsProvider({
children,
}) {
const [
settings,
setSettings,
] = useState(() =>
getDefaultPublicPlatformSettings()
);

const [
loading,
setLoading,
] = useState(true);

const [
error,
setError,
] = useState(null);

const refreshSettings =
useCallback(
async ({
silent = false,
} = {}) => {
if (!silent) {
setLoading(true);
}


    setError(null);

    try {
      const nextSettings =
        await getPublicPlatformSettings();

      setSettings(
        nextSettings
      );

      return nextSettings;
    } catch (
      refreshError
    ) {
      console.error(
        'Unable to load platform settings:',
        refreshError
      );

      setError(
        refreshError
      );

      return null;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  },
  []
);


useEffect(() => {
void refreshSettings();
}, [refreshSettings]);

useEffect(() => {
function handleWindowFocus() {
void refreshSettings({
silent: true,
});
}


window.addEventListener(
  'focus',
  handleWindowFocus
);

return () => {
  window.removeEventListener(
    'focus',
    handleWindowFocus
  );
};


}, [refreshSettings]);

const value = useMemo(
() => ({
settings,
loading,
error,


  platformName:
    settings.platform_name,

  supportEmail:
    settings.support_email,

  maintenanceMode:
    settings.maintenance_mode,

  studentRegistrationEnabled:
    settings.allow_student_registration,

  employerRegistrationEnabled:
    settings.allow_employer_registration,

  publicInternshipBrowsingEnabled:
    settings.allow_public_internship_browsing,

  applicationWithdrawalEnabled:
    settings.application_withdrawal_enabled,

  refreshSettings,
}),
[
  settings,
  loading,
  error,
  refreshSettings,
]


);

return (
<PlatformSettingsContext.Provider
value={value}
>
{children}
</PlatformSettingsContext.Provider>
);
}

export {
PlatformSettingsProvider,
usePlatformSettings,
};
