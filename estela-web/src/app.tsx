import React, { Component, Fragment, Suspense } from "react";
import { Switch, Router } from "react-router-dom";
import { MainRoutes } from "./routes";
import { UserProvider } from "./context";

import history from "./history";
import ComponentRoutes from "ExternalComponents/ComponentRoutes";

export class App extends Component<unknown, unknown> {
    render(): JSX.Element {
        return (
            <Fragment>
                <Router history={history}>
                    <Switch>
                        <Suspense>
                            <UserProvider>
                                <MainRoutes />
                            </UserProvider>
                            <ComponentRoutes />
                        </Suspense>
                    </Switch>
                </Router>
            </Fragment>
        );
    }
}
