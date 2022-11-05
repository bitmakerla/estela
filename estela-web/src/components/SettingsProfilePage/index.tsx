import React, { Component, Fragment } from "react";
import { Button, Layout, Space, Row, Input } from "antd";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { authNotification, ProfileSettingsSideNav, Header, Spin } from "../../shared";

const { Content } = Layout;

interface ProfileSettingsPageState {
    loaded: boolean;
}

export class SettingsProfilePage extends Component<unknown, ProfileSettingsPageState> {
    state: ProfileSettingsPageState = {
        loaded: false,
    };

    apiService = ApiService();

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            this.setState({ loaded: true });
        }
    }
    render(): JSX.Element {
        const { loaded } = this.state;
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
                                        <Input className="input_profile" placeholder="username"></Input>
                                    </div>
                                    <div className="float-left">
                                        <p className="text-lg text-estela-black-low mt-2">Email address</p>
                                    </div>
                                    <div className="bg-white">
                                        <Input className="input_profile" placeholder="scraper@domain.com"></Input>
                                    </div>
                                </Space>
                                <Row className="w-full 2xl:w-9/12 my-8 ">
                                    <div className="float-left  w-full">
                                        <Button className="btn_profile">Save changes</Button>
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
