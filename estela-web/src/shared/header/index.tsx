import React, { Component } from "react";
import { Layout, Row, Col, Dropdown, Badge } from "antd";
import type { MenuProps } from "antd";
import { Link } from "react-router-dom";

import history from "../../history";
import {
    AuthService,
    ApiService,
    ApiNotificationsListRequest,
    ApiNotificationsUpdateRequest,
    Notification,
} from "../../services";
import { UserContext, UserContextProps } from "../../context";
import { RequestTag, ScrapyTag } from "../../components/FrameworkTag";

import User from "../../assets/icons/user.svg";
import Message from "../../assets/icons/notification.svg";
import ArrowDown from "../../assets/icons/arrowDown.svg";
import Dashboard from "../../assets/icons/dashboard.svg";
import Settings from "../../assets/icons/setting.svg";
import Logout from "../../assets/icons/logout.svg";
import Circle from "../../assets/icons/ellipse.svg";
import userDropdownSideNavItems from "ExternalComponents/DropdownComponent";

const { Header, Content } = Layout;
type MenuItem = Required<MenuProps>["items"][number];

interface HeaderState {
    notifications: Notification[];
    path: string;
    news: boolean;
}

export class CustomHeader extends Component<unknown, HeaderState> {
    state: HeaderState = {
        notifications: [],
        path: "",
        news: false,
    };
    timer: NodeJS.Timeout | undefined;

    async componentDidMount() {
        userDropdownSideNavItems.forEach((element: MenuItem) => {
            this.itemsUser?.push(element);
        });
        const key_logout = this.itemsUser?.length;
        this.itemsUser?.push({
            key: `${key_logout && key_logout + 1}`,
            label: (
                <Content className="stroke-black hover:stroke-estela hover:bg-button-hover rounded">
                    <Link to={""} className="flex items-center hover:text-estela-blue-full" onClick={this.logout}>
                        <Logout className="mx-1 w-6 h-6" />
                        Logout
                    </Link>
                </Content>
            ),
            style: { backgroundColor: "white" },
        });
        this.getNotifications();
        this.setState({ path: document.location.pathname });
        this.timer = setInterval(() => {
            this.getNotifications();
        }, 15000);
    }

    componentWillUnmount() {
        clearInterval(this.timer);
    }

    apiService = ApiService();
    static contextType = UserContext;

    getNotifications = async (): Promise<void> => {
        const requestParams: ApiNotificationsListRequest = {
            pageSize: 3,
        };
        this.apiService.apiNotificationsList(requestParams).then((response) => {
            this.setState({ news: false });
            if (response.count === 0) {
                return;
            }
            let change = false;
            response.results.find((notification) => {
                if (notification.seen === false) {
                    change = true;
                }
            });
            this.setState({ news: change });
            this.setState({ notifications: response.results });
        });
    };

    isLogged = (): boolean => {
        return Boolean(AuthService.getAuthToken());
    };

    getUser = (): string => {
        const { username } = this.context as UserContextProps;
        return username;
    };

    getFramework = (): React.ReactElement => {
        const framework = AuthService.getFramework();
        if (framework === "REQUESTS") {
            return <RequestTag />;
        } else if (framework === "SCRAPY") {
            return <ScrapyTag />;
        }
        return <></>;
    };

    getUserRole = (): string => {
        const { role } = this.context as UserContextProps;
        return role ?? "";
    };

    logout = (): void => {
        AuthService.removeAuthToken();
        AuthService.removeUserUsername();
        AuthService.removeUserEmail();
        AuthService.removeUserRole();
        const { updateUsername, updateAccessToken, updateEmail, updateRole } = this.context as UserContextProps;
        updateUsername("");
        updateEmail("");
        updateRole && updateRole("");
        updateAccessToken("");
        history.push("/login");
    };

    renderNotificationIcon = (inbox: boolean, news: boolean): React.ReactNode => {
        const color = inbox
            ? "stroke-estela-blue-full bg-estela-blue-low border border-estela-blue-full"
            : "hover:stroke-estela-blue-full stroke-estela-black-full hover:bg-estela-blue-low";
        return (
            <a className={`flex justify-center items-center rounded-lg w-14 h-14 ${color}`}>
                <Badge offset={[0, 2]} dot={news}>
                    <Message className="w-6 h-6" />
                </Badge>
            </a>
        );
    };

    itemsUser: MenuProps["items"] = [
        {
            key: "1",
            label: (
                <Content className="stroke-black hover:stroke-estela hover:bg-button-hover rounded">
                    <Link
                        to={""}
                        onClick={() => {
                            const { updateRole } = this.context as UserContextProps;
                            updateRole && updateRole("");
                        }}
                        className="flex items-center hover:text-estela-blue-full"
                    >
                        <Dashboard className="mx-1 w-6 h-6" />
                        Home
                    </Link>
                </Content>
            ),
            style: { backgroundColor: "white" },
        },
        {
            key: "2",
            label: (
                <Content className="stroke-black hover:stroke-estela-blue-full hover:bg-button-hover rounded">
                    <Link
                        to={"/settings/profile"}
                        onClick={() => {
                            const { updateRole } = this.context as UserContextProps;
                            updateRole && updateRole("");
                        }}
                        className="flex items-center hover:text-estela-blue-full"
                    >
                        <Settings className="mx-1 w-6 h-6" />
                        Account Settings
                    </Link>
                </Content>
            ),
            style: { backgroundColor: "white" },
        },
    ];

    changeNotificationStatus(nid: number | undefined): void {
        const notifications = this.state.notifications;
        const index = notifications.findIndex((notification) => notification.nid == nid);
        if (notifications[index].seen) return;

        const requestData = {
            seen: true,
        };
        const requestParams: ApiNotificationsUpdateRequest = {
            nid: Number(nid),
            data: requestData,
        };

        notifications[index].seen = true;
        this.setState({ notifications: notifications });
        this.apiService.apiNotificationsUpdate(requestParams).then((response) => {
            notifications[index].seen = response.seen;
            this.setState({ notifications: notifications });
        });
    }

    notificationItems = (): MenuProps["items"] => [
        {
            key: "1",
            label: (
                <Content className="w-[360px] mt-1">
                    {this.state.notifications.map((notification) => (
                        <div
                            onClick={(event) => {
                                this.changeNotificationStatus(notification.nid);
                                event.stopPropagation();
                            }}
                            className="py-2 px-3 flex cursor-pointer hover:bg-estela-blue-low hover:text-estela-blue-full rounded-md"
                            key={notification.nid}
                        >
                            {!notification.seen ? (
                                <Badge count={<Circle className="fill-estela-blue-full h-2 mr-2 my-1" />}></Badge>
                            ) : (
                                <div className="mr-[22px]"></div>
                            )}
                            <div>
                                <span className="font-semibold text-sm capitalize">
                                    {notification.activity?.user.username == AuthService.getUserUsername()
                                        ? "You"
                                        : notification.activity?.user.username}
                                </span>
                                {AuthService.getUserUsername() == notification.activity.user.username
                                    ? " have "
                                    : " has "}
                                {notification.activity.description}
                                <p className="text-xs text-estela-black-low">
                                    {notification.activity.created?.toDateString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </Content>
            ),
            style: { backgroundColor: "white" },
        },
        {
            key: "2",
            label: (
                <Content
                    onClick={() => {
                        this.setState({ path: "/notifications/inbox" });
                    }}
                >
                    <Link
                        className="text-estela-blue-full h-8 items-center text-center rounded-md hover:text-estela-blue-full hover:bg-estela-blue-low font-semibold flex justify-center"
                        to={"/notifications/inbox"}
                    >
                        See all
                    </Link>
                </Content>
            ),
            style: { backgroundColor: "white" },
        },
    ];

    noNotifications = (): MenuProps["items"] => [
        {
            key: "1",
            label: (
                <Content
                    className="w-[320px] rounded-md p-2 hover:bg-estela-blue-low m-0"
                    onClick={() => {
                        this.setState({ path: "/notifications/inbox" });
                    }}
                >
                    <Link
                        to={"/notifications/inbox"}
                        className="text-sm text-estela-blue-full hover:text-estela-blue-full font-medium"
                    >
                        You don&apos;t have any notifications yet.
                    </Link>
                </Content>
            ),
            style: { backgroundColor: "white" },
        },
    ];

    render(): JSX.Element {
        const { path, notifications, news } = this.state;
        return (
            <Header className="h-[72px] bg-white py-1">
                <Row justify="center" align="middle" className="flex justify-between">
                    <Col className="flex gap-4 justify-center items-center">
                        <Link to="/" className=" text-xl hover:text-estela">
                            estela
                        </Link>
                        {this.getFramework()}
                    </Col>
                    <Col className="flex">
                        <Dropdown
                            menu={{
                                items: notifications.length ? this.notificationItems() : this.noNotifications(),
                            }}
                            trigger={["click"]}
                        >
                            {this.renderNotificationIcon(path === "/notifications/inbox", news)}
                        </Dropdown>
                        <Dropdown menu={{ items: this.itemsUser }} trigger={["click"]}>
                            <a className="flex hover:bg-estela-blue-low hover:text-estela-blue-full text-estela-blue-full h-14 px-5 rounded-lg">
                                <div className="flex gap-5">
                                    <User className="stroke-estela rounded-full bg-white h-9 w-9 p-1 my-auto" />
                                    <Row className="grid grid-cols-1 my-auto" align="middle">
                                        <Col className="font-medium text-base h-6">{this.getUser()}</Col>
                                        {this.getUserRole() !== "" && (
                                            <Col className="text-estela-black-medium capitalize text-sm h-6">
                                                {this.getUserRole()}
                                            </Col>
                                        )}
                                    </Row>
                                    <ArrowDown className="stroke-estela h-5 w-4 my-auto" />
                                </div>
                            </a>
                        </Dropdown>
                    </Col>
                </Row>
            </Header>
        );
    }
}
