import React, { Component } from "react";
import { Layout, Space } from "antd";

import { Link } from "react-router-dom";
import "./styles.scss";

import Ellipse from "../../assets/icons/ellipse.svg";
import { ApiService, AuthService } from "../../services";
import { ApiNotificationsListRequest, Notification } from "../../services/api";
import { authNotification } from "../../shared";

const { Content } = Layout;
interface NotificationList {
    nid?: number;
    message: string;
    user: number;
    redirectto: string;
    seen?: boolean;
    createdAt?: Date;
}

interface NotificationsData {
    notifications: NotificationList[];
}

export class NotificationsList extends Component<unknown, unknown> {
    PAGE_SIZE = 10;
    apiService = ApiService();
    state: NotificationsData = {
        notifications: [],
    };
    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            const data = await this.getProjects(1);
            const notificationsData: NotificationList[] = data.data.map((project: Notification) => {
                return {
                    message: project.message,
                    nid: project.nid,
                    redirectto: project.redirectto,
                    seen: project.seen,
                    createdAt: project.createdAt,
                    user: project.user,
                };
            });
            console.log(notificationsData);
            this.setState({
                notifications: [...notificationsData],
                count: data.count,
                current: data.current,
                loaded: true,
            });
        }
    }
    async getProjects(page: number): Promise<{ data: Notification[]; count: number; current: number }> {
        const requestParams: ApiNotificationsListRequest = { page, pageSize: this.PAGE_SIZE, uid: "7" };
        const data = await this.apiService.apiNotificationsList(requestParams);
        return { data: data.results, count: data.count, current: page };
    }
    render(): JSX.Element {
        const { notifications } = this.state;
        return (
            <Layout className="flex sm:w-5/5 w-5/5 bg-white">
                {notifications.map((notification) => {
                    return (
                        <div key={notification.nid}>
                            <Layout className="bg-white p-2 overflow-hidden hover:text-estela hover:bg-estela-blue-low rounded-md">
                                <Link to={notification.redirectto}>
                                    <Space className="flex items-center" align="end">
                                        {!notification.seen ? (
                                            <Ellipse className="mx-1 fill-current text-estela" width={20} height={20} />
                                        ) : (
                                            <Ellipse className="mx-1 fill-current text-white" width={20} height={20} />
                                        )}
                                        <Content>
                                            <Content className="text-sm overflow-ellipsis">
                                                {notification.message}
                                            </Content>
                                            <Content className="text-xs text-estela-black-low">
                                                {notification.createdAt?.toString()}
                                            </Content>
                                        </Content>
                                    </Space>
                                </Link>
                            </Layout>
                        </div>
                    );
                })}
            </Layout>
        );
    }
}
