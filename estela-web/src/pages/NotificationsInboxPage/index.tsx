import React, { Component, ReactElement } from "react";
import { Layout, Badge, Pagination } from "antd";
import {
    AuthService,
    ApiService,
    ApiNotificationsListRequest,
    Notification,
    ApiNotificationsUpdateRequest,
} from "../../services";
import { Spin, PaginationItem } from "../../shared";
import Circle from "../../assets/icons/ellipse.svg";
import FolderDotted from "../../assets/icons/folderDotted.svg";
import "./styles.scss";
import { convertDateToString } from "../../utils";

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
        });
    };

    onPageChange = async (page: number): Promise<void> => {
        await this.getNotifications(page);
    };

    changeNotificationStatus(nid: number): void {
        const notifications = this.state.notifications;
        const index = notifications.findIndex((notification) => notification.nid == nid);
        if (notifications[index].seen) return;

        const requestData = {
            seen: true,
        };
        const requestParams: ApiNotificationsUpdateRequest = {
            nid: nid,
            data: requestData,
        };

        notifications[index].seen = true;
        this.setState({ notifications: notifications });
        this.apiService.apiNotificationsUpdate(requestParams).then((response) => {
            notifications[index].seen = response.seen;
            this.setState({ notifications: notifications });
        });
    }

    emptyNotification = (): ReactElement => (
        <Content className="flex flex-col mb-10 items-center justify-center text-estela-black-medium">
            <FolderDotted className="w-20 h-20" />
            <p>No projects yet.</p>
        </Content>
    );

    render(): JSX.Element {
        const { loaded, notifications, count, current } = this.state;
        return (
            <Layout className="bg-white rounded-r-2xl">
                <Content className="m-10">
                    <p className="text-2xl mb-6 text-black">Inbox</p>
                    {loaded ? (
                        <Content>
                            {notifications.length == 0 && this.emptyNotification()}
                            {notifications.map((notification) => (
                                <div
                                    onClick={() => this.changeNotificationStatus(notification.nid)}
                                    className="py-2 px-3 flex hover:bg-estela-blue-low hover:text-estela-blue-full rounded-md"
                                    style={{ cursor: "pointer" }}
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
                                        <span className="font-semibold text-estela-black-full text-sm">
                                            {convertDateToString(notification.activity.created)}:&nbsp;
                                            {notification.activity.user.username == AuthService.getUserUsername()
                                                ? "You"
                                                : notification.activity.user.username}
                                        </span>
                                        {AuthService.getUserEmail() == notification.activity.user.email
                                            ? " have "
                                            : " has "}
                                        {notification.activity.description} Project:&nbsp;
                                        <span className="font-semibold text-estela-black-full">
                                            {notification.activity.project.name} ({notification.activity.project.pid})
                                        </span>
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
