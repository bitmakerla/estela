import React, { Component } from "react";
import { Layout, Badge } from "antd";
import { AuthService, ApiService, ApiNotificationsListRequest, Notification } from "../../services";
import { Spin } from "../../shared";
import Circle from "../../assets/icons/ellipse.svg";
import "./styles.scss";

const { Content } = Layout;

interface NotificationInboxState {
    notifications: Notification[];
    loaded: boolean;
}

export class NotificationsInboxPage extends Component<unknown, NotificationInboxState> {
    PAGE_SIZE = 10;
    state: NotificationInboxState = {
        notifications: [],
        loaded: false,
    };

    apiService = ApiService();

    async componentDidMount(): Promise<void> {
        this.getNotifications();
    }

    getNotifications = async (): Promise<void> => {
        const requestParams: ApiNotificationsListRequest = {
            pageSize: this.PAGE_SIZE,
        };
        this.apiService.apiNotificationsList(requestParams).then((response) => {
            this.setState({ notifications: response.results, loaded: true });
            console.log(response.results);
        });
    };

    render(): JSX.Element {
        const { loaded, notifications } = this.state;
        return (
            <Layout className="bg-white rounded-2xl">
                <Content className="m-10">
                    <p className="text-2xl mb-6 text-black">Inbox</p>
                    {loaded ? (
                        <Content>
                            {notifications.map((notification) => (
                                <div
                                    className="py-2 px-3 flex hover:bg-estela-blue-low hover:text-estela-blue-full rounded-md"
                                    key={notification.nid}
                                >
                                    {!notification.seen ? (
                                        <Badge
                                            count={<Circle className="fill-estela-blue-full h-2 mr-2 my-1" />}
                                        ></Badge>
                                    ) : (
                                        <Badge
                                            count={<Circle className="fill-estela-blue-low h-2 mr-2 my-1" />}
                                        ></Badge>
                                    )}
                                    <div className="text-estela-black-medium">
                                        <span className="font-semibold text-estela-black-full text-sm capitalize">
                                            {notification.user.email == AuthService.getUserEmail()
                                                ? "You"
                                                : notification.user.username}
                                        </span>
                                        {AuthService.getUserEmail() == notification.user.email ? " have " : " has "}
                                        {notification.message}
                                        <p className="text-xs text-estela-black-low">
                                            {notification.createdAt?.toDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </Content>
                    ) : (
                        <Spin />
                    )}
                </Content>
            </Layout>
        );
    }
}
