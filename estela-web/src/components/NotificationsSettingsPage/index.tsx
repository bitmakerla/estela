import React, { Component } from "react";
import { Layout, Space, Row } from "antd";

import "./styles.scss";
import { AuthService } from "../../services";
<<<<<<< HEAD
import { authNotification, Header, NotificationsSidenav } from "../../shared";
=======
import { authNotification, Header, NotificationsList, NotificationsSidenav } from "../../shared";
>>>>>>> e078f51 (added notification settings page, using temp data)

export class NotificationsSettingsPage extends Component<unknown, unknown> {
    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
        }
    }
    updateNotifications = (): void => {
        console.log("Preferences updated");
    };

    render(): JSX.Element {
        return (
            <Layout className="">
                <Header />
                <Layout className="bg-metal pt-16 pl-16">
                    <NotificationsSidenav path={"/notifications/settings"} />
                    <Layout className="bg-white pl-16">
                        <p className="text-2xl py-5 text-black">Notifications settings</p>
                        <Layout className="bg-white w-4/5 flex">
                            <Row className="pb-8">
                                <Space>
                                    <label className="inline-flex relative items-center mr-5 cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" />
                                        <div
                                            onClick={() => {
                                                this.updateNotifications();
                                            }}
                                            className="w-11 h-6 bg-gray-200 rounded-full peer  peer-focus:ring-green-300  peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"
                                        ></div>
                                    </label>
                                    <Layout className="bg-white">
                                        <Layout className="text-sm bg-white overflow-ellipsis">News and Updates</Layout>
                                        <Layout className="bg-white text-xs text-estela-black-low">
                                            News about Estela and feature updates.
                                        </Layout>
                                    </Layout>
                                </Space>
                            </Row>
                            <Row>
                                <Space>
                                    <label className="inline-flex relative items-center mr-5 cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" />
                                        <div
                                            onClick={() => {
                                                this.updateNotifications();
                                            }}
                                            className="w-11 h-6 bg-gray-200 rounded-full peer  peer-focus:ring-green-300  peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"
                                        ></div>
                                    </label>
                                    <Layout className="bg-white">
                                        <Layout className="text-sm bg-white overflow-ellipsis">
                                            Reply to Personal Email
                                        </Layout>
                                        <Layout className="bg-white text-xs text-estela-black-low">
                                            Reply Estela notifications to my personal email scraper202122@domain.com.
                                        </Layout>
                                    </Layout>
                                </Space>
                            </Row>
                        </Layout>
                    </Layout>
                </Layout>
            </Layout>
        );
    }
}
