import {
BriefcaseBusiness,
LockKeyhole,
} from 'lucide-react';

import {
Link,
} from 'react-router-dom';

import {
useAuth,
} from '../context/AuthContext';

import {
usePlatformSettings,
} from '../context/PlatformSettingsContext';

function PublicInternshipAccessGate ({
    children,
}) {
    const {
        isAuthenticated, loading: authLoading,
    } = useAuth();

    const {
        publicInternshipBrowsingEnabled, supportEmail, loading: settingsLoading,
    } = usePlatformSettings();

    if (authLoading ||
        settingsLoading) {
        return (<div className="mx-auto max-w-5xl px-4 py-16"> <div className="card p-10 text-center"> <p className="font-semibold text-slate-500">
            Checking internship access… </p> </div> </div>
        );
    }

    if (publicInternshipBrowsingEnabled ||
        isAuthenticated) {
        return children;
    }

    return (<main className="mx-auto max-w-3xl px-4 py-16"> <section className="card p-7 text-center sm:p-10"> <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300"> <LockKeyhole size={30} /> </div>


        <p className="mt-6 text-sm font-black uppercase tracking-wider text-amber-600">
            Sign-in required
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-tight">
            Public internship browsing is currently unavailable
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-500">
            Internship listings are currently available only to
            signed-in users. Sign in with your existing account to
            continue browsing opportunities.
        </p>

        {supportEmail && (
            <p className="mt-4 text-sm text-slate-500">
                Need assistance?{' '}
                <a
                    href={'mailto:' +
                        supportEmail}
                    className="font-bold text-brand-600"
                >
                    {supportEmail}
                </a>
            </p>
        )}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
                to="/login/student"
                className="btn-primary inline-flex items-center justify-center gap-2"
            >
                <BriefcaseBusiness
                    size={17} />

                Student sign in
            </Link>

            <Link
                to="/login/employer"
                className="btn-secondary"
            >
                Employer sign in
            </Link>

            <Link
                to="/"
                className="btn-secondary"
            >
                Back to home
            </Link>
        </div>
    </section>
    </main>


    );
}

export {
PublicInternshipAccessGate,
};
