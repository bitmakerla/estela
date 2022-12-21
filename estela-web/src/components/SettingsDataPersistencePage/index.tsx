import React, { Component, Fragment } from "react";
import { Button, Radio, Layout, Space, Row } from "antd";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { authNotification, ProfileSettingsSideNav, Header, Spin } from "../../shared";

import SwitchOFF from "../../assets/icons/switchOFF.svg";
import SwitchON from "../../assets/icons/switchON.svg";
import Help from "../../assets/icons/help.svg";

const { Content } = Layout;

interface DataPersistencePageState {
    loaded: boolean;
    switchValue: boolean;
    persistenceChanged: boolean;
    persistenceValue: string;
}

export class SettingsDataPersistencePage extends Component<unknown, DataPersistencePageState> {
    state: DataPersistencePageState = {
        loaded: false,
        switchValue: false,
        persistenceChanged: false,
        persistenceValue: "",
    };

    apiService = ApiService();

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            this.setState({ loaded: true });
        }
    }

    handlePersistenceChange = (test: string): void => {
        this.setState({ persistenceChanged: true });
        this.setState({ persistenceValue: test });
    };

    change = (): void => {
        if (this.state["switchValue"]) {
            this.setState({ switchValue: false });
        } else {
            this.setState({ switchValue: true });
        }
    };

    render(): JSX.Element {
        const { loaded, switchValue } = this.state;
        return (
            <Layout className="h-screen">
                <Header />
                <Layout className="bg-metal p-6">
                    <ProfileSettingsSideNav path={"dataPersistence"} />
                    {loaded ? (
                        <Fragment>
                            <Content className="mx-32 mr-10">
                                <Space direction="vertical" className="w-full my-4">
                                    <div className="float-left">
                                        <p className="text-3xl">Data persistence</p>
                                        <p className="mt-5 text-base text-estela-black-medium">
                                            Here you can select how long you would like to retain data in Bitmaker
                                            Cloud.
                                        </p>
                                    </div>
                                    <Row className="mt-2 text-base w-11/12">
                                        <p className="flex items-center justify-center mr-80">
                                            General data persistence
                                        </p>
                                        <Space className="inline-block align-middle float-right">
                                            <Radio.Group className="grid grid-cols-3 lg:grid-cols-3 xl:grid-cols-7 gap-2 lg:my-6 my-4">
                                                <Radio.Button
                                                    value="1 day"
                                                    onClick={() => {
                                                        this.handlePersistenceChange("1 day");
                                                    }}
                                                >
                                                    1 day
                                                </Radio.Button>
                                                <Radio.Button
                                                    value="1 week"
                                                    onClick={() => {
                                                        this.handlePersistenceChange("1 week");
                                                    }}
                                                >
                                                    1 week
                                                </Radio.Button>
                                                <Radio.Button
                                                    value="1 month"
                                                    onClick={() => {
                                                        this.handlePersistenceChange("1 month");
                                                    }}
                                                >
                                                    1&nbsp;month
                                                </Radio.Button>
                                                <Radio.Button
                                                    value="3 months"
                                                    onClick={() => {
                                                        this.handlePersistenceChange("3 months");
                                                    }}
                                                >
                                                    3&nbsp;months
                                                </Radio.Button>
                                                <Radio.Button
                                                    value="6 months"
                                                    onClick={() => {
                                                        this.handlePersistenceChange("6 months");
                                                    }}
                                                >
                                                    6&nbsp;months
                                                </Radio.Button>
                                                <Radio.Button
                                                    value="1 year"
                                                    onClick={() => {
                                                        this.handlePersistenceChange("1 year");
                                                    }}
                                                >
                                                    1 year
                                                </Radio.Button>
                                                <Radio.Button
                                                    value="forever"
                                                    onClick={() => {
                                                        this.handlePersistenceChange("forever");
                                                    }}
                                                >
                                                    Forever
                                                </Radio.Button>
                                            </Radio.Group>
                                        </Space>
                                    </Row>
                                    <Space direction="horizontal" className="flex items-center">
                                        {switchValue ? (
                                            <Button
                                                className="border-none fill-estela"
                                                icon={
                                                    <SwitchON className="fill-estela w-8 h-8" onClick={this.change} />
                                                }
                                            ></Button>
                                        ) : (
                                            <Button
                                                className="border-none"
                                                icon={<SwitchOFF className="w-8 h-8" onClick={this.change} />}
                                            ></Button>
                                        )}
                                        <p className="ml-4 text-base">Override per project </p>
                                        <Button
                                            className="border-none flex justify-center"
                                            icon={<Help className="w-6 h-6" />}
                                        ></Button>
                                    </Space>
                                    <Row className="w-full 2xl:w-9/12 ">
                                        <Button className="mt-5 btn_data_persistence" disabled>
                                            Save changes
                                        </Button>
                                    </Row>
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
