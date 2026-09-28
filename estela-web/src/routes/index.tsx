import React from "react";
import { Switch, Route, Redirect } from "react-router-dom";

import { NotificationsInboxPage } from "../pages/NotificationsInboxPage";
import { NotificationsSettingsPage } from "../pages/NotificationsSettingsPage";
import { ProjectListPage } from "../pages/ProjectListPage";
import { ProjectSettingsPage } from "../pages/ProjectSettingsPage";
import { ProjectMemberPage } from "../pages/ProjectMemberPage";
import { ProjectJobListPage } from "../pages/ProjectJobListPage";
import { ProjectCronJobListPage } from "../pages/ProjectCronJobListPage";
import { ProjectActivityPage } from "../pages/ProjectActivityPage";
import { DeployListPage } from "../pages/DeployListPage";
import { SpiderListPage } from "../pages/SpiderListPage";
import { SpiderDetailPage } from "../pages/SpiderDetailPage";
import { JobDetailPage } from "../pages/JobDetailPage";
import { CronJobDetailPage } from "../pages/CronJobDetailPage";
import { JobDataListPage } from "../pages/JobDataListPage";
import { ProjectDashboardPage } from "../pages/ProjectDashboardPage";
import { SettingsProfilePage } from "../pages/SettingsProfilePage";
import { SettingsDataPersistencePage } from "../pages/SettingsDataPersistencePage";
import { SettingsApiKeysPage } from "../pages/SettingsApiKeysPage";
import { ProjectLayout, MainLayout, NotificationsLayout, SettingsLayout } from "../shared";
import { PrivateRoute } from "../shared";

export const MainRoutes: React.FC = () => {
    return (
        <Switch>
            {/* Signing in happens at the gateway before this app even loads, so /login only
                survives for old links and bookmarks. */}
            <Route path={["/", "/login"]} exact>
                <Redirect to="/projects" />
            </Route>

            <PrivateRoute path={["/projects"]} exact>
                <MainLayout>
                    <Route path="/projects" component={ProjectListPage} exact />
                </MainLayout>
            </PrivateRoute>

            <PrivateRoute
                path={[
                    "/projects/:projectId/dashboard",
                    "/projects/:projectId/settings",
                    "/projects/:projectId/deploys",
                    "/projects/:projectId/members",
                    "/projects/:projectId/spiders",
                    "/projects/:projectId/jobs",
                    "/projects/:projectId/cronjobs",
                    "/projects/:projectId/activity",
                    "/projects/:projectId/spiders/:spiderId",
                    "/projects/:projectId/spiders/:spiderId/jobs/:jobId/data/:dataType",
                    "/projects/:projectId/spiders/:spiderId/jobs/:jobId",
                    "/projects/:projectId/spiders/:spiderId/cronjobs",
                    "/projects/:projectId/spiders/:spiderId/cronjobs/create",
                    "/projects/:projectId/spiders/:spiderId/cronjobs/:cronjobId",
                ]}
                exact
            >
                <ProjectLayout>
                    <Route path="/projects/:projectId/dashboard" component={ProjectDashboardPage} exact />
                    <Route path="/projects/:projectId/settings" component={ProjectSettingsPage} exact />
                    <Route path="/projects/:projectId/deploys" component={DeployListPage} exact />
                    <Route path="/projects/:projectId/members" component={ProjectMemberPage} exact />
                    <Route path="/projects/:projectId/spiders" component={SpiderListPage} exact />
                    <Route path="/projects/:projectId/jobs" component={ProjectJobListPage} exact />
                    <Route path="/projects/:projectId/cronjobs" component={ProjectCronJobListPage} exact />
                    <Route path="/projects/:projectId/activity" component={ProjectActivityPage} exact />
                    <Route path="/projects/:projectId/spiders/:spiderId" component={SpiderDetailPage} exact />
                    <Route
                        path="/projects/:projectId/spiders/:spiderId/jobs/:jobId/data/:dataType"
                        component={JobDataListPage}
                        exact
                    />
                    <Route path="/projects/:projectId/spiders/:spiderId/jobs/:jobId" component={JobDetailPage} exact />
                    <Route
                        path="/projects/:projectId/spiders/:spiderId/cronjobs/:cronjobId"
                        component={CronJobDetailPage}
                        exact
                    />
                </ProjectLayout>
            </PrivateRoute>

            <PrivateRoute path={["/notifications/inbox", "/notifications/settings"]} exact>
                <MainLayout>
                    <NotificationsLayout>
                        <Route path="/notifications/inbox" component={NotificationsInboxPage} exact />
                        <Route path="/notifications/settings" component={NotificationsSettingsPage} exact />
                    </NotificationsLayout>
                </MainLayout>
            </PrivateRoute>

            <PrivateRoute path={["/settings/profile", "/settings/apiKeys", "/settings/dataPersistence"]} exact>
                <MainLayout>
                    <SettingsLayout>
                        <Route path="/settings/profile" component={SettingsProfilePage} exact />
                        <Route path="/settings/apiKeys" component={SettingsApiKeysPage} exact />
                        <Route path="/settings/dataPersistence" component={SettingsDataPersistencePage} exact />
                    </SettingsLayout>
                </MainLayout>
            </PrivateRoute>
        </Switch>
    );
};
