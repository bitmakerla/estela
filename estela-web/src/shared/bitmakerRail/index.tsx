import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { LAUNCHER_URL } from "../../constants";

/*
 * The Bitmaker service rail: the bar on the left that jumps to the other Bitmaker services
 * (Sereno, Datasets, Billing...). It is the launcher's <bitmaker-rail> element, loaded from the
 * launcher at runtime, so it is the same in every service and changes without a release here.
 * Only when the build sets REACT_APP_LAUNCHER_URL; otherwise this renders its children alone.
 *
 * It wraps every route (app.tsx) rather than sitting in each layout, so moving between a project
 * and the settings, which use different layouts, keeps the same rail instead of rebuilding it.
 */

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
        interface IntrinsicElements {
            "bitmaker-rail": { current?: string; "home-url"?: string };
        }
    }
}

// estela's own sign-in pages (AUTH_MODE=local): nobody is signed in there yet.
const SIGNED_OUT_PATHS = ["/login", "/register", "/forgotPassword", "/resetPassword", "/activatedAccount"];

let requested = false;

function loadRail(): void {
    if (requested) return;
    requested = true;
    const script = document.createElement("script");
    script.src = LAUNCHER_URL + "rail.js";
    // A launcher that is down costs the rail, never the page: the element stays undefined and
    // renders nothing.
    script.onerror = () => console.warn("Bitmaker rail: could not load", script.src);
    document.head.append(script);
}

interface BitmakerRailFrameProps {
    children: JSX.Element | JSX.Element[];
}

export const BitmakerRailFrame: React.FC<BitmakerRailFrameProps> = ({ children }) => {
    const { pathname } = useLocation();
    const show = LAUNCHER_URL !== "" && !SIGNED_OUT_PATHS.includes(pathname);

    useEffect(() => {
        if (show) loadRail();
    }, [show]);

    if (!show) return <>{children}</>;
    return (
        <div className="flex">
            <bitmaker-rail current="estela" home-url={LAUNCHER_URL} />
            {/* On phones the rail is a bar along the bottom: room for it (0 until rail.js loads). */}
            <div className="flex-1 min-w-0" style={{ paddingBottom: "var(--bitmaker-rail-height, 0px)" }}>
                {children}
            </div>
        </div>
    );
};
