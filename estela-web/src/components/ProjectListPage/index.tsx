import React, { Component, Fragment, ReactElement } from "react";
import { Link } from "react-router-dom";
import { Button, Layout, Pagination, Space, Row, Col, Tag, Table } from "antd";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { ReactComponent as Add } from "../../assets/icons/add.svg";
import { ApiProjectsListRequest, Project } from "../../services/api";
import { authNotification, Header, Spin } from "../../shared";

const { Content } = Layout;

interface ProjectsPageState {
    projects: Project[];
    username: string;
    loaded: boolean;
    count: number;
    current: number;
}

export class ProjectListPage extends Component<unknown, ProjectsPageState> {
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
                <Link className="text-sm font-medium hover:text-estela" to={`/projects/${project.pid}`}>
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
            <Layout className="h-screen">
                <Header />
                <Layout className="bg-metal p-6">
                    {loaded ? (
                        <Fragment>
                            <Content className="mx-4">
                                <Space direction="vertical" className="mx-8">
                                    <div className="float-left">
                                        <p className="text-3xl">
                                            Welcome home&nbsp;
                                            <span className="text-estela">{this.getUser()}</span>!
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-md p-6 mx-4">
                                        <Row className="flow-root items-center my-2">
                                            <Col className="float-left">
                                                <p className="text-silver text-base font-medium">MY PROJECTS</p>
                                            </Col>
                                            <Col className="float-right">
                                                <Link to={"/projects/create"}>
                                                    <Button
                                                        icon={<Add className="mr-2" width={15} />}
                                                        className="flex items-center text-sm font-medium stroke-estela border-white text-estela hover:bg-button-hover hover:text-estela hover:border-estela rounded-md"
                                                    >
                                                        Start new project
                                                    </Button>
                                                </Link>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Table
                                                showHeader={false}
                                                tableLayout="fixed"
                                                className="rounded-2xl"
                                                columns={this.columns}
                                                dataSource={projects}
                                                pagination={false}
                                                size="middle"
                                            />
                                        </Row>
                                        <Pagination
                                            className="pagination"
                                            defaultCurrent={1}
                                            total={count}
                                            current={current}
                                            pageSize={this.PAGE_SIZE}
                                            onChange={this.onPageChange}
                                            showSizeChanger={false}
                                        />
                                    </div>
                                    {/* <div cl/ */}
                                </Space>
                            </Content>
                        </Fragment>
                    ) : (
                        <Spin />
                    )}
                </Layout>
            </Layout>
        );
    }
}
