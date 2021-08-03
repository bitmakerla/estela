import React, { Component } from "react";
import { Router, Switch, Route, Redirect } from "react-router-dom";

import history from "../history";
import { LoginPage } from "../components/LoginPage";
import { ProjectsPage } from "../components/ProjectsPage";

export class MainRoutes extends Component<unknown, unknown> {
    render(): JSX.Element {
        return (
            <Router history={history}>
                <Switch>
                    <Route exact path="/">
                        <Redirect to="/login" />
                    </Route>
                    <Route path="/login" component={LoginPage} />
                    <Route path="/projects" component={ProjectsPage} />
                </Switch>
            </Router>
        );
    }
}
