import React, { Component } from "react";
import { Layout, Button, Row, Col } from "antd";

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
                <Header path={"/notifications/inbox"} />
                <Layout className="bg-metal pt-16 pl-16">
                    <NotificationsSidenav path={"/notifications/inbox"} />
                    <Layout className="bg-white pl-16">
                        <Row>
                            <Col flex={1}>
                                <p className="text-2xl pb-8 pt-5 text-black">Inbox</p>
                            </Col>
                            <Col
                                flex={0.6}
                                className="
                                justify-center pb-8 pt-5 text-estela font-semibold flex rounded-2xl"
                            >
                                <Button>Mark all as read</Button>
                            </Col>
                        </Row>
                        <Layout className="bg-white w-4/5 flex">
                            <NotificationsList page_size={300} />
                        </Layout>
                    </Layout>
                </Layout>
            </Layout>
        );
    }
}
