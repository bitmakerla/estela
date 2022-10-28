import React, { Component } from "react";
import { Layout } from "antd";

import "./styles.scss";
import { AuthService } from "../../services";
import { authNotification, Header, NotificationsList, NotificationsSidenav } from "../../shared";

export class NotificationsInboxPage extends Component<unknown, unknown> {
    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
        }
    }

    render(): JSX.Element {
        return (
            <Layout className="">
                <Header />
                <Layout className="bg-metal pt-16 pl-16">
                    <NotificationsSidenav path={"/notifications/inbox"} />
                    <Layout className="bg-white pl-16">
                        <p className="text-2xl pb-8 pt-5 text-black">Inbox</p>
                        <Layout className="bg-white w-4/5 flex">
                            <NotificationsList />
                        </Layout>
                    </Layout>
                </Layout>
            </Layout>
        );
    }
}
