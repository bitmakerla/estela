import React, { useEffect, useContext } from "react";
import { Route } from "react-router-dom";
import { UserContext } from "../../context";
import { AuthService } from "../../services";
import { API_BASE_URL } from "../../constants";
import { invalidDataNotification } from "../notifications";

type RouteProps = {
    render?: () => JSX.Element;
    children?: JSX.Element;
    path?: string | string[];
    exact?: boolean;
    sensitive?: boolean;
    strict?: boolean;
};

/*
 * Every page sits behind the gateway: if this app loaded at all, the browser had a session.
 * What is left here is learning who signed in, and noticing when the session runs out.
 *
 * A 401 from the gateway has no JSON body and means the session is gone, so this starts a new
 * sign-in that comes back to the same page. A 401 from estela carries a reason (an inactive
 * account, say), and is shown instead: sending that person to sign in again would loop, since
 * the gateway would let them straight back in. The one exception is a password change, which
 * does need a new sign-in, so that one ends the gateway's session first.
 */
export const PrivateRoute: React.FC<RouteProps> = (route) => {
    const { updateUsername, updateEmail } = useContext(UserContext);
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/auth/whoami`).then(async (response) => {
            if (response.ok) {
                const user = await response.json();
                AuthService.setUserUsername(user.username);
                AuthService.setUserEmail(user.email);
                updateUsername(user.username);
                updateEmail(user.email);
                return;
            }
            const data = await response.json().catch(() => null);
            const reason = data?.detail ?? null;
            if (data?.code === "reauthenticate") {
                // The password changed since this sign-in: end the gateway's session too, so
                // the next one asks for the new password instead of reusing the old session.
                window.location.assign("/oauth2/sign_out?rd=%2F");
                return;
            }
            if (response.status === 401 && !reason) {
                const back = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.assign(`/oauth2/start?rd=${back}`);
                return;
            }
            invalidDataNotification(reason ?? `Could not load your account (${response.status}).`);
        });
    }, []);

    return <Route path={route.path} exact={route.exact} render={() => route.children} />;
};
