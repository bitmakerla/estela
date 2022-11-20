import React, { Component, Fragment, Suspense } from "react";
import { Switch, Router } from "react-router-dom";
import { MainRoutes } from "./routes";

import history from "./history";
import { ExternalRoutes } from "./externalComponets";

export class App extends Component<unknown, unknown> {
    render(): JSX.Element {
        return (
            <Fragment>
                <Router history={history}>
                    <Switch>
                        <Suspense fallback={<div>Loading...</div>}>
                            <MainRoutes />
                            <ExternalRoutes />
                        </Suspense>
                    </Switch>
                </Router>
            </Fragment>
        );
    }
}
