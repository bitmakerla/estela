import React, { Component } from "react";
import { Switch, Route, Redirect } from "react-router-dom";

import { LoginPage } from "../components/LoginPage";
import { RegisterPage } from "../components/RegisterPage";
import { NotificationsInboxPage } from "../components/NotificationsInboxPage";
import { NotificationsSettingsPage } from "../components/NotificationsSettingsPage";
import { ProjectListPage } from "../components/ProjectListPage";
import { ProjectDetailPage } from "../components/ProjectDetailPage";
import { ProjectSettingsPage } from "../components/ProjectSettingsPage";
import { ProjectMemberPage } from "../components/ProjectMemberPage";
import { ProjectJobListPage } from "../components/ProjectJobListPage";
import { ProjectCronJobListPage } from "../components/ProjectCronJobListPage";
import { ProjectActivityPage } from "../components/ProjectActivityPage";
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
import { SettingsProfilePage } from "../components/SettingsProfilePage";
import { SettingsPasswordPage } from "../components/SettingsPasswordPage";
import { SettingsDataPersistencePage } from "../components/SettingsDataPersistencePage";

export class MainRoutes extends Component<unknown, unknown> {
    render(): JSX.Element {
        return (
            <Switch>
                <Route path="/" exact>
                    <Redirect to="/login" />
                </Route>
                <Route path="/login" component={LoginPage} exact />
                <Route path="/register" component={RegisterPage} exact />
                <Route path="/notifications/inbox" component={NotificationsInboxPage} exact />
                <Route path="/notifications/settings" component={NotificationsSettingsPage} exact />
                <Route path="/projects" component={ProjectListPage} exact />
                <Route path="/projects/:projectId" component={ProjectDetailPage} exact />
                <Route path="/projects/:projectId/dashboard" component={ProjectDashboardPage} exact />
                <Route path="/projects/:projectId/settings" component={ProjectSettingsPage} exact />
                <Route path="/projects/:projectId/deploys" component={DeployListPage} exact />
                <Route path="/projects/:projectId/members" component={ProjectMemberPage} exact />
                <Route path="/projects/:projectId/spiders" component={SpiderListPage} exact />
                <Route path="/projects/:projectId/jobs" component={ProjectJobListPage} exact />
                <Route path="/projects/:projectId/cronjobs" component={ProjectCronJobListPage} exact />
                <Route path="/projects/:projectId/activity" component={ProjectActivityPage} exact />
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
                <Route path="/settings/profile" component={SettingsProfilePage} exact />
                <Route path="/settings/password" component={SettingsPasswordPage} exact />
                <Route path="/settings/dataPersistence" component={SettingsDataPersistencePage} exact />
            </Switch>
        );
    }
}
