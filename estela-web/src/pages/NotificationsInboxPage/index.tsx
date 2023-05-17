import React, { Component } from "react";
import { Layout } from "antd";

import "./styles.scss";
import { NotificationsList } from "../../shared";

export class NotificationsInboxPage extends Component<unknown, unknown> {
    render(): JSX.Element {
        return (
            <Layout className="bg-white pl-16">
                <p className="text-2xl pb-8 pt-5 text-black">Inbox</p>
                <Layout className="bg-white w-4/5 flex">
                    <NotificationsList />
                </Layout>
            </Layout>
        );
    }
}
