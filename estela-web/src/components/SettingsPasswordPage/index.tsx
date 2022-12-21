import React, { Component, Fragment } from "react";
import { Button, Layout, Space } from "antd";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { Project, ApiProjectsReadRequest, ApiProjectsListRequest } from "../../services/api";
import { authNotification, resourceNotAllowedNotification, ProfileSettingsSideNav, Header, Spin } from "../../shared";

const { Content } = Layout;

interface PasswordSettingsPageState {
    loaded: boolean;
    btnSend: boolean;
    email: string;
}

export class SettingsPasswordPage extends Component<unknown, PasswordSettingsPageState> {
    state: PasswordSettingsPageState = {
        loaded: false,
        btnSend: false,
        email: "********",
    };

    apiService = ApiService();

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            this.setEmailUser();
            this.setState({ loaded: true });
        }
    }

    sendRequest = () => {
        this.setState({ btnSend: true });
    };

    async setEmailUser() {
        const requestParamsP: ApiProjectsListRequest = { page: 1, pageSize: 10 };
        const data = await this.apiService.apiProjectsList(requestParamsP);
        const project: Project = data.results[0];
        let projectId = project.pid;
        if (!projectId) projectId = "";
        const requestParams: ApiProjectsReadRequest = { pid: projectId };
        this.apiService.apiProjectsRead(requestParams).then(
            (response: Project) => {
                let users = response.users;
                if (users === undefined) {
                    users = [];
                }
                let user_email = users.find((item) => item.user?.username === AuthService.getUserUsername())?.user
                    ?.email;
                if (!user_email) user_email = "";
                const div: number = Math.trunc(user_email.length / 4);
                user_email = user_email.slice(div);
                let hidden_email = "";
                for (let index = 0; index < div; index++) {
                    hidden_email += "*";
                }
                user_email = hidden_email.concat(user_email);
                this.setState({ email: user_email });
            },
            (error: unknown) => {
                console.error(error);
                resourceNotAllowedNotification();
            },
        );
    }

    render(): JSX.Element {
        const { loaded, btnSend, email } = this.state;
        return (
            <Layout className="h-screen">
                <Header />
                <Layout className="bg-metal p-6">
                    <ProfileSettingsSideNav path={"password"} />
                    {loaded ? (
                        <Fragment>
                            <Content className="mx-32 mr-10">
                                <Space direction="vertical" className="w-full 2xl:w-9/12 my-4">
                                    <div className="">
                                        <p className="text-3xl">Change password</p>
                                        <p className="mt-4 text-base text-estela-black-medium">
                                            If you want to reset your password, request a password change sending an
                                            email to {email}. You can change your password every 6 months.
                                        </p>
                                        <p className="mt-4 text-base text-estela-black-medium">
                                            Last change: 01/01/20222
                                        </p>
                                    </div>
                                    {!btnSend ? (
                                        <Button className="my-8 btn_password" disabled onClick={this.sendRequest}>
                                            Send request
                                        </Button>
                                    ) : (
                                        <button className="my-8 btn_sendRequest">Request sended</button>
                                    )}
                                </Space>
                            </Content>
                        </Fragment>
                    ) : (
                        <Spin />
                    )}
                </Layout>
            </Layout>
        );
    }
}
