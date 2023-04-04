import React, { Component } from "react";
import { Layout, Badge, Pagination } from "antd";
import { AuthService, ApiService, ApiNotificationsListRequest, Notification } from "../../services";
import { Spin, PaginationItem } from "../../shared";
import Circle from "../../assets/icons/ellipse.svg";
import "./styles.scss";

const { Content } = Layout;

interface NotificationInboxState {
    notifications: Notification[];
    loaded: boolean;
    count: number;
    current: number;
}

export class NotificationsInboxPage extends Component<unknown, NotificationInboxState> {
    PAGE_SIZE = 10;
    state: NotificationInboxState = {
        notifications: [],
        loaded: false,
        count: 0,
        current: 1,
    };

    apiService = ApiService();

    async componentDidMount(): Promise<void> {
        this.getNotifications(1);
    }

    getNotifications = async (page: number): Promise<void> => {
        const requestParams: ApiNotificationsListRequest = {
            pageSize: this.PAGE_SIZE,
            page: page,
        };
        this.apiService.apiNotificationsList(requestParams).then((response) => {
            this.setState({ notifications: response.results, loaded: true, count: response.count, current: page });
            // console.log(response);
        });
    };

    onPageChange = async (page: number): Promise<void> => {
        await this.getNotifications(page);
    };

    changeNotificationStatus(nid: number | undefined): void {
        const notifications = this.state.notifications;
        const index = notifications.findIndex((notification) => notification.nid == nid);
        notifications[index].seen = true;
        this.setState({ notifications: notifications });
    }

    render(): JSX.Element {
        const { loaded, notifications, count, current } = this.state;
        return (
            <Layout className="bg-white rounded-r-2xl">
                <Content className="m-10">
                    <p className="text-2xl mb-6 text-black">Inbox</p>
                    {loaded ? (
                        <Content>
                            {notifications.map((notification) => (
                                <div
                                    onClick={() => this.changeNotificationStatus(notification.nid)}
                                    className="py-2 px-3 flex hover:bg-estela-blue-low hover:text-estela-blue-full rounded-md"
                                    key={notification.nid}
                                >
                                    {!notification.seen ? (
                                        <Badge
                                            count={<Circle className="fill-estela-blue-full h-2 mr-2 my-1" />}
                                        ></Badge>
                                    ) : (
                                        <div className="mr-[22px]"></div>
                                    )}
                                    <div className="text-estela-black-medium">
                                        <span className="font-semibold text-estela-black-full text-sm capitalize">
                                            {notification.user.email == AuthService.getUserEmail()
                                                ? "You"
                                                : notification.user.username}
                                        </span>
                                        {AuthService.getUserEmail() == notification.user.email ? " have " : " has "}
                                        {notification.message}&nbsp;In&nbsp;
                                        <span className="font-semibold text-estela-black-full">
                                            {notification.project.name}&apos;
                                        </span>
                                        s project.
                                        <p className="text-xs text-estela-black-low">
                                            {notification.createdAt?.toDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <Pagination
                                className="pagination"
                                defaultCurrent={1}
                                total={count}
                                current={current}
                                pageSize={this.PAGE_SIZE}
                                onChange={this.onPageChange}
                                showSizeChanger={false}
                                itemRender={PaginationItem}
                            />
                        </Content>
                    ) : (
                        <Spin />
                    )}
                </Content>
            </Layout>
        );
    }
}
