import React, { Component, Fragment } from "react";
import { Button, Layout, Space } from "antd";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { authNotification, ProfileSettingsSideNav, Header, Spin } from "../../shared";

const { Content } = Layout;

interface PasswordSettingsPageState {
    loaded: boolean;
    btnSend: boolean;
}

export class SettingsPasswordPage extends Component<unknown, PasswordSettingsPageState> {
    state: PasswordSettingsPageState = {
        loaded: false,
        btnSend: false,
    };

    apiService = ApiService();

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            this.setState({ loaded: true });
        }
    }

    sendRequest = () => {
        this.setState({ btnSend: true });
    };

    render(): JSX.Element {
        const { loaded, btnSend } = this.state;
        return (
            <Layout className="h-screen">
                <Header />
                <Layout className="bg-metal p-6">
                    <ProfileSettingsSideNav path={"/password"} />
                    {loaded ? (
                        <Fragment>
                            <Content className="mx-32 mr-10">
                                <Space direction="vertical" className="w-full 2xl:w-9/12 my-4">
                                    <div className="">
                                        <p className="font-sans text-3xl">Change password</p>
                                        <p className="mt-4 text-base text-estela-black-medium">
                                            If you want to reset your password, request a password change sending an
                                            email to ******2122@domain.com. You can change your password every 6 months.
                                        </p>
                                        <p className="mt-4 text-base text-estela-black-medium">
                                            Last change: 01/01/20222
                                        </p>
                                    </div>
                                    {!btnSend ? (
                                        <Button className="my-8 btn_password" onClick={this.sendRequest}>
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
