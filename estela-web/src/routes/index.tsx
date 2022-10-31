import React, { Component, Suspense, Fragment } from "react";
import { Router, Switch, Route, Redirect } from "react-router-dom";

import { LoginPage } from "../components/LoginPage";
import { RegisterPage } from "../components/RegisterPage";
import { NotificationsInboxPage } from "../components/NotificationsInboxPage";
import { NotificationsSettingsPage } from "../components/NotificationsSettingsPage";
import { ProjectListPage } from "../components/ProjectListPage";
import { ProjectDetailPage } from "../components/ProjectDetailPage";
import { ProjectSettingsPage } from "../components/ProjectSettingsPage";
import { ProjectCreatePage } from "../components/ProjectCreatePage";
import { ProjectMemberPage } from "../components/ProjectMemberPage";
import { ProjectJobListPage } from "../components/ProjectJobListPage";
import { ProjectCronJobListPage } from "../components/ProjectCronJobListPage";
import { DeployListPage } from "../components/DeployListPage";
import { SpiderListPage } from "../components/SpiderListPage";
import { SpiderDetailPage } from "../components/SpiderDetailPage";
import { JobDetailPage } from "../components/JobDetailPage";
import { JobCreatePage } from "../components/JobCreatePage";
import { CronJobListPage } from "../components/CronJobListPage";
import { CronJobCreatePage } from "../components/CronJobCreatePage";
import { CronJobDetailPage } from "../components/CronJobDetailPage";
import { JobDataListPage } from "../components/JobDataListPage";
import { ProjectDashboardPage } from "../components/ProjectDashboardPage";

const External_component = (): JSX.Element => {
    if (process.env.component_path != undefined) {
        const ComponentRoutes = React.lazy(() => import(`${process.env.component_path}`));
        return (
            <Fragment>
                <ComponentRoutes />
            </Fragment>
        );
    }
    return <Fragment></Fragment>;
};

export class MainRoutes extends Component<unknown, unknown> {
    render(): JSX.Element {
        return (
            <Router history={history}>
                <Switch>
                    <Route path="/" exact>
                        <Redirect to="/login" />
                    </Route>
                    <Route path="/login" component={LoginPage} exact />
                    <Route path="/register" component={RegisterPage} exact />
                    <Route path="/notifications/inbox" component={NotificationsInboxPage} exact />
                    <Route path="/notifications/settings" component={NotificationsSettingsPage} exact />
                    <Route path="/projects" component={ProjectListPage} exact />
                    <Route path="/projects/create" component={ProjectCreatePage} exact />
                    <Route path="/projects/:projectId" component={ProjectDetailPage} exact />
                    <Route path="/projects/:projectId/dashboard" component={ProjectDashboardPage} exact />
                    <Route path="/projects/:projectId/settings" component={ProjectSettingsPage} exact />
                    <Route path="/projects/:projectId/deploys" component={DeployListPage} exact />
                    <Route path="/projects/:projectId/members" component={ProjectMemberPage} exact />
                    <Route path="/projects/:projectId/spiders" component={SpiderListPage} exact />
                    <Route path="/projects/:projectId/jobs" component={ProjectJobListPage} exact />
                    <Route path="/projects/:projectId/cronjobs" component={ProjectCronJobListPage} exact />
                    <Route path="/projects/:projectId/spiders/:spiderId" component={SpiderDetailPage} exact />
                    <Route path="/projects/:projectId/spiders/:spiderId/jobs/create" component={JobCreatePage} exact />
                    <Route
                        path="/projects/:projectId/spiders/:spiderId/jobs/:jobId/data/:dataType"
                        component={JobDataListPage}
                        exact
                    />
                    <Route path="/projects/:projectId/spiders/:spiderId/jobs/:jobId" component={JobDetailPage} exact />
                    <Route path="/projects/:projectId/spiders/:spiderId/cronjobs" component={CronJobListPage} exact />
                    <Route
                        path="/projects/:projectId/spiders/:spiderId/cronjobs/create"
                        component={CronJobCreatePage}
                        exact
                    />
                    <Route
                        path="/projects/:projectId/spiders/:spiderId/cronjobs/:cronjobId"
                        component={CronJobDetailPage}
                        exact
                    />
                </Switch>
            </Router>
        );
    }
}
