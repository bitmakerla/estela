import React from "react";
import { Switch, Route, Redirect } from "react-router-dom";

import { ActivatedAccountPage } from "../pages/ActivatedAccountPage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
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
import { SettingsPasswordPage } from "../pages/SettingsPasswordPage";
import { SettingsDataPersistencePage } from "../pages/SettingsDataPersistencePage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { ProjectLayout, AuthLayout, MainLayout, NotificationsLayout, SettingsLayout } from "../shared";
import { PrivateRoute } from "../shared";

export const MainRoutes: React.FC = () => {
    return (
        <Switch>
            <Route path="/" exact>
                <Redirect to="/login" />
            </Route>

            <Route path={["/login", "/register", "/forgotPassword", "/resetPassword", "/activatedAccount"]} exact>
                <AuthLayout>
                    <Route path="/login" component={LoginPage} exact />
                    <Route path="/register" component={RegisterPage} exact />
                    <Route path="/forgotPassword" component={ForgotPasswordPage} exact />
                    <Route path="/resetPassword" component={ResetPasswordPage} exact />
                    <Route path="/activatedAccount" component={ActivatedAccountPage} exact />
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
