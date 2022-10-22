import React, { Component, Fragment, ReactElement } from "react";
import { Link } from "react-router-dom";
import { Button, Layout, Pagination, Space, Row, Col, Tag, Table, Menu } from "antd";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { ReactComponent as Add } from "../../assets/icons/add.svg";
import { ApiProjectsListRequest, Project } from "../../services/api";
import { authNotification, Header, NotificationsList, NotificationsSidenav } from "../../shared";
import { LayoutContext } from "antd/lib/layout/layout";

const { Content } = Layout;

interface ProjectsPageState {
    projects: Project[];
    username: string;
    loaded: boolean;
    count: number;
    current: number;
}

interface NotificationsInboxPropsInterface {
    projectId: string;
    path: string;
}

const { Sider } = Layout;

export class NotificationsInboxPage extends Component<NotificationsInboxPropsInterface, ProjectsPageState> {
    path = this.props.path;
    PAGE_SIZE = 10;
    totalProjects = 0;

    state: ProjectsPageState = {
        projects: [],
        username: "",
        loaded: false,
        count: 0,
        current: 0,
    };

    apiService = ApiService();

    columns = [
        {
            title: "NAME",
            dataIndex: "name",
            key: "name",
            render: (name: string, project: Project): ReactElement => (
                <Link className="text-sm font-medium hover:text-estela" to={`/projects/${project.pid}/dashboard`}>
                    {name}
                </Link>
            ),
        },
        {
            title: "ROLE",
            dataIndex: "role",
            key: "role",
            render: (): ReactElement => (
                <Tag className="text-estela border-0 rounded bg-button-hover float-right" key={1}>
                    Admin
                </Tag>
            ),
        },
    ];

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            const data = await this.getProjects(1);
            const projects: Project[] = data.data;
            this.setState({ projects: [...projects], count: data.count, current: data.current, loaded: true });
        }
    }

    getUser = (): string => {
        return String(AuthService.getUserUsername());
    };

    async getProjects(page: number): Promise<{ data: Project[]; count: number; current: number }> {
        const requestParams: ApiProjectsListRequest = { page, pageSize: this.PAGE_SIZE };
        const data = await this.apiService.apiProjectsList(requestParams);
        this.totalProjects = data.count;
        return { data: data.results, count: data.count, current: page };
    }

    onPageChange = async (page: number): Promise<void> => {
        this.setState({ loaded: false });
        const data = await this.getProjects(page);
        const projects: Project[] = data.data;
        this.setState({
            projects: [...projects],
            count: data.count,
            current: data.current,
            loaded: true,
        });
    };

    render(): JSX.Element {
        const { projects, loaded, count, current } = this.state;
        return (
            <Layout className="">
                <Header />
                <Layout className="bg-metal pt-16 pl-16">
                    <NotificationsSidenav path={"/notifications/inbox"} />
                    <Layout className="bg-white pl-16">
                        <p className="text-2xl pb-8 text-black">Inbox</p>
                        <NotificationsList />
                        {/* <Layout className="bg-green w-max flex">
                        </Layout> */}
                    </Layout>
                </Layout>
            </Layout>
        );
    }
}
