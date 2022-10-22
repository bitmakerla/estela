import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Menu, Row, Col, Layout, Divider } from "antd";

import "./styles.scss";
import { textChangeRangeIsUnchanged } from "typescript";

import { ReactComponent as Ellipse } from "../../assets/icons/ellipse.svg";
import { ReactComponent as Logout } from "../../assets/icons/logout.svg";

const notis = [
    {
        id: 1,
        seen: false,
        message: "Scraper202122 has run a job in MySpider spider",
        date: "Jan 01, 2022 at 9:15 AM",
    },
    {
        id: 2,
        seen: false,
        message: "Scraper202122 has invited you to join project MyProject",
        date: "Jan 01, 2022 at 9:15 AM",
    },
    {
        id: 3,
        seen: true,
        message: "You have changed the role of MyProject project, from admin to developer.",
        date: "Jan 01, 2022 at 9:15 AM",
    },
    {
        id: 4,
        seen: true,
        message: "You created the MyFirstProject project ",
        date: "Jan 01, 2022 at 8:15 AM",
    },
];

export class NotificationsList extends Component<unknown, unknown> {
    render(): JSX.Element {
        return (
            <Layout className="flex w-4/5 bg-white">
                {notis.map((notification) => {
                    return (
                        <div key={notification.id}>
                            <Layout className="bg-white pb-2 hover:text-estela hover:bg-estela-blue-low">
                                <Row>
                                    <Col className="text-center" flex={"37px"}>
                                        {!notification.seen ? (
                                            <Ellipse className="mx-1 fill-current text-estela" width={20} height={20} />
                                        ) : null}
                                    </Col>
                                    <Col>
                                        <Row className="text-sm">{notification.message}</Row>
                                        <Row className="text-xs text-estela-black-low">{notification.date}</Row>
                                    </Col>
                                </Row>
                            </Layout>
                        </div>
                    );
                })}
                {/* <Sider width={240}>
                <Menu mode="inline" className="h-full" defaultOpenKeys={["2", "5"]}>
                    <div>
                        <p className="m-5 text-estela-black-medium text-base">NOTIFICATIONS</p>
                    </div>
                    <Menu.Item key={"/notifications/inbox"} className="">
                        <div className="flex items-center stroke-black hover:stroke-estela hover:bg-button-hover hover:text-estela rounded">
                            <Link to={`/projects//dashboard`}>Inbox</Link>
                        </div>
                    </Menu.Item>
                    <Menu.Item key={"/notifications/settings"} className="">
                        <div className="flex items-center stroke-black hover:stroke-estela hover:bg-button-hover hover:text-estela rounded">
                            <Link to={`/projects//dashboard`}>Settings</Link>
                        </div>
                    </Menu.Item>
                </Menu>
            </Sider> */}
            </Layout>
        );
    }
}
