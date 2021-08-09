import React, { Component } from "react";
import { Router, Switch, Route, Redirect } from "react-router-dom";

import history from "../history";
import { LoginPage } from "../components/LoginPage";
import { ProjectListPage } from "../components/ProjectListPage";
import { ProjectDetailPage } from "../components/ProjectDetailPage";
import { ProjectCreatePage } from "../components/ProjectCreatePage";
import { SpiderListPage } from "../components/SpiderListPage";
import { SpiderDetailPage } from "../components/SpiderDetailPage";

export class MainRoutes extends Component<unknown, unknown> {
    render(): JSX.Element {
        return (
            <Router history={history}>
                <Switch>
                    <Route path="/" exact>
                        <Redirect to="/login" />
                    </Route>
                    <Route path="/login" component={LoginPage} exact />
                    <Route path="/projects" component={ProjectListPage} exact />
                    <Route path="/projects/create" component={ProjectCreatePage} exact />
                    <Route path="/projects/:projectId" component={ProjectDetailPage} exact />
                    <Route path="/projects/:projectId/spiders" component={SpiderListPage} exact />
                    <Route path="/projects/:projectId/spiders/:spiderId" component={SpiderDetailPage} exact />
                </Switch>
            </Router>
        );
    }
}
