import React, { Component, Fragment } from "react";
import { Button, Layout, Space, Row, Input } from "antd";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { Project, ApiProjectsReadRequest, ApiProjectsListRequest } from "../../services/api";
import { authNotification, resourceNotAllowedNotification, ProfileSettingsSideNav, Header, Spin } from "../../shared";

const { Content } = Layout;

interface ProfileSettingsPageState {
    loaded: boolean;
    email: string;
}

export class SettingsProfilePage extends Component<unknown, ProfileSettingsPageState> {
    state: ProfileSettingsPageState = {
        loaded: false,
        email: "Loading",
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

    getUser = (): string => {
        return String(AuthService.getUserUsername());
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
                this.setState({ email: user_email });
            },
            (error: unknown) => {
                console.error(error);
                resourceNotAllowedNotification();
            },
        );
    }

    render(): JSX.Element {
        const { loaded, email } = this.state;
        return (
            <Layout className="h-screen">
                <Header />
                <Layout className="bg-metal p-6">
                    <ProfileSettingsSideNav path={"/profile"} />
                    {loaded ? (
                        <Fragment>
                            <Content className="mx-32 mr-10">
                                <Row className="w-full my-4">
                                    <div className="float-left">
                                        <p className="font-sans text-3xl">Profile settings</p>
                                    </div>
                                </Row>
                                <Space direction="vertical" className="w-full 2xl:w-9/12 my-4">
                                    <div className="float-left">
                                        <p className="text-lg">Username</p>
                                    </div>
                                    <div className="bg-white">
                                        <Input
                                            value={this.getUser()}
                                            className="input_profile"
                                            placeholder="username"
                                        ></Input>
                                    </div>
                                    <div className="float-left">
                                        <p className="text-lg text-estela-black-low mt-2">Email address</p>
                                    </div>
                                    <div className="bg-white">
                                        <Input
                                            value={email}
                                            className="input_profile"
                                            placeholder="scraper@domain.com"
                                        ></Input>
                                    </div>
                                </Space>
                                <Row className="w-full 2xl:w-9/12 my-8 ">
                                    <div className="float-left  w-full">
                                        <Button className="btn_profile" disabled>
                                            Save changes
                                        </Button>
                                    </div>
                                </Row>
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
