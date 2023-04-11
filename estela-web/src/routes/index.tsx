import React from "react";
import { Switch, Route, Redirect } from "react-router-dom";

import { LoginPage } from "../components/LoginPage";
import { RegisterPage } from "../components/RegisterPage";
import { NotificationsInboxPage } from "../components/NotificationsInboxPage";
import { NotificationsSettingsPage } from "../components/NotificationsSettingsPage";
import { ProjectListPage } from "../components/ProjectListPage";
import { ProjectSettingsPage } from "../components/ProjectSettingsPage";
import { ProjectMemberPage } from "../components/ProjectMemberPage";
import { ProjectJobListPage } from "../components/ProjectJobListPage";
import { ProjectCronJobListPage } from "../components/ProjectCronJobListPage";
import { ProjectActivityPage } from "../components/ProjectActivityPage";
import { DeployListPage } from "../components/DeployListPage";
import { SpiderListPage } from "../components/SpiderListPage";
import { SpiderDetailPage } from "../components/SpiderDetailPage";
import { JobDetailPage } from "../components/JobDetailPage";
import { CronJobListPage } from "../components/CronJobListPage";
import { CronJobCreatePage } from "../components/CronJobCreatePage";
import { CronJobDetailPage } from "../components/CronJobDetailPage";
import { JobDataListPage } from "../components/JobDataListPage";
import { ProjectDashboardPage } from "../components/ProjectDashboardPage";
import { SettingsProfilePage } from "../components/SettingsProfilePage";
import { SettingsPasswordPage } from "../components/SettingsPasswordPage";
import { SettingsDataPersistencePage } from "../components/SettingsDataPersistencePage";
import { ForgotPasswordPage } from "../components/ForgotPasswordPage";
import { ResetPasswordPage } from "../components/ResetPasswordPage";
import { ProjectLayout, AuthLayout, MainLayout, NotificationsLayout, SettingsLayout } from "../shared";
import { PrivateRoute } from "../shared";

export const MainRoutes: React.FC = () => {
    return (
        <Switch>
            <Route path="/" exact>
                <Redirect to="/login" />
            </Route>

            <Route path={["/login", "/register", "/forgotPassword", "/resetPassword"]} exact>
                <AuthLayout>
                    <Route path="/login" component={LoginPage} exact />
                    <Route path="/register" component={RegisterPage} exact />
                    <Route path="/forgotPassword" component={ForgotPasswordPage} exact />
                    <Route path="/resetPassword" component={ResetPasswordPage} exact />
                </AuthLayout>
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

            <PrivateRoute path={["/settings/profile", "/settings/password", "/settings/dataPersistence"]} exact>
                <MainLayout>
                    <SettingsLayout>
                        <Route path="/settings/profile" component={SettingsProfilePage} exact />
                        <Route path="/settings/password" component={SettingsPasswordPage} exact />
                        <Route path="/settings/dataPersistence" component={SettingsDataPersistencePage} exact />
                    </SettingsLayout>
                </MainLayout>
            </PrivateRoute>
        </Switch>
    );
};
