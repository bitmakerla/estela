import React, { Component, ReactElement } from "react";
import { Button, Layout, Pagination, Typography, Row, Space, Table, Col, Menu } from "antd";
import type { MenuProps } from "antd";
import { PlusOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { RouteComponentProps, Link } from "react-router-dom";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import {
    ApiProjectsSpidersReadRequest,
    ApiProjectsSpidersJobsListRequest,
    Spider,
    SpiderJob,
} from "../../services/api";
import { authNotification, resourceNotAllowedNotification, Header, ProjectSidenav, Spin } from "../../shared";
import { convertDateToString } from "../../utils";

const { Content } = Layout;
const { Text, Title } = Typography;

interface SpiderJobData {
    id: number | undefined;
    key: number | undefined;
    date: string;
    status: string | undefined;
    cronjob: number | null | undefined;
}

interface SpiderDetailPageState {
    name: string;
    jobs: SpiderJobData[];
    loaded: boolean;
    count: number;
    current: number;
    pageTab: string;
}

interface RouteParams {
    projectId: string;
    spiderId: string;
}

export class SpiderDetailPage extends Component<RouteComponentProps<RouteParams>, SpiderDetailPageState> {
    PAGE_SIZE = 10;
    state: SpiderDetailPageState = {
        name: "",
        jobs: [],
        loaded: false,
        count: 0,
        current: 0,
        pageTab: "overview",
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    spiderId: string = this.props.match.params.spiderId;
    columns = [
        {
            title: "Job ID",
            dataIndex: "id",
            key: "id",
            render: (jobID: number): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}/jobs/${jobID}`}>{jobID}</Link>
            ),
        },
        {
            title: "Date",
            dataIndex: "date",
            key: "date",
        },
        {
            title: "Cronjob",
            key: "cronjob",
            dataIndex: "cronjob",
            render: (cronjob: number): ReactElement =>
                cronjob ? (
                    <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}/cronjobs/${cronjob}`}>
                        {cronjob}
                    </Link>
                ) : (
                    <div></div>
                ),
        },
        {
            title: "Status",
            key: "status",
            dataIndex: "status",
        },
    ];

    itemsDetailMenu: MenuProps["items"] = [
        {
            label: <Text className="text-[#6C757D]">Overview</Text>,
            key: "overview",
        },
        {
            label: <Text className="text-[#6C757D]">Settings</Text>,
            key: "settings",
        },
    ];

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            const requestParams: ApiProjectsSpidersReadRequest = { pid: this.projectId, sid: parseInt(this.spiderId) };
            this.apiService.apiProjectsSpidersRead(requestParams).then(
                async (response: Spider) => {
                    const data = await this.getSpiderJobs(1);
                    const jobs: SpiderJobData[] = data.data;
                    this.setState({
                        name: response.name,
                        jobs: [...jobs],
                        count: data.count,
                        current: data.current,
                        loaded: true,
                    });
                },
                (error: unknown) => {
                    console.error(error);
                    resourceNotAllowedNotification();
                },
            );
        }
    }

    onDetailMenuTabChange: MenuProps["onClick"] = (e) => {
        this.setState({
            pageTab: e.key,
        });
    };

    getSpiderJobs = async (page: number): Promise<{ data: SpiderJobData[]; count: number; current: number }> => {
        const requestParams: ApiProjectsSpidersJobsListRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            page,
            pageSize: this.PAGE_SIZE,
        };
        const response = await this.apiService.apiProjectsSpidersJobsList(requestParams);
        const data = response.results.map((job: SpiderJob, iterator: number) => ({
            key: iterator,
            id: job.jid,
            args: job.args,
            date: convertDateToString(job.created),
            status: job.jobStatus,
            cronjob: job.cronjob,
        }));
        return { data, count: response.count, current: page };
    };

    onPageChange = async (page: number): Promise<void> => {
        this.setState({ loaded: false });
        const data = await this.getSpiderJobs(page);
        const jobs: SpiderJobData[] = data.data;
        this.setState({
            jobs: [...jobs],
            count: data.count,
            current: data.current,
            loaded: true,
        });
    };

    render(): JSX.Element {
        const { loaded, name, jobs, count, current, pageTab } = this.state;
        return (
            <Layout className="general-container">
                <Header />
                <Layout className="white-background">
                    <ProjectSidenav projectId={this.projectId} path={"/spiders"} />
                    <Content className="content-padding">
                        {loaded ? (
                            <Layout className="white-background">
                                <Content>
                                    <Row>
                                        <Col span={4}>
                                            <Text className="text-[#6C757D]">My Spider</Text>
                                        </Col>
                                        <Col span={4} offset={11}>
                                            <Button
                                                className="
                                                hover:bg-indigo-600 hover:text-white 
                                                text-white bg-indigo-600 rounded-md
                                                py-5 alignment-button-icon"
                                                icon={<PlusOutlined />}
                                                size="middle"
                                            >
                                                <Text className="text-white">Schedule new job</Text>
                                            </Button>
                                        </Col>
                                        <Col span={4} offset={1}>
                                            <Button
                                                className="                                                hover:bg-indigo-600 hover:text-white 
                                                text-white bg-indigo-600 rounded-md
                                                py-5 alignment-button-icon"
                                                icon={<PlayCircleOutlined />}
                                                size="middle"
                                            >
                                                <Text className="text-white">Run new job</Text>
                                            </Button>
                                        </Col>
                                    </Row>
                                    <Menu
                                        onClick={this.onDetailMenuTabChange}
                                        selectedKeys={[this.state.pageTab]}
                                        mode="horizontal"
                                        items={this.itemsDetailMenu}
                                    />
                                    {pageTab === "overview" && (
                                        <Content>
                                            <Title level={4} className="text-center">
                                                {name}
                                            </Title>
                                            <Row justify="center" className="spider-data">
                                                <Space direction="vertical" size="large">
                                                    <Text>
                                                        <b>Spider ID:</b>&nbsp; {this.spiderId}
                                                    </Text>
                                                    <Text>
                                                        <b>Project ID:</b>
                                                        <Link to={`/projects/${this.projectId}`}>
                                                            &nbsp; {this.projectId}
                                                        </Link>
                                                    </Text>
                                                    <Table
                                                        columns={this.columns}
                                                        dataSource={jobs}
                                                        pagination={false}
                                                        size="middle"
                                                    />
                                                </Space>
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
                                            <Link
                                                to={`/projects/${this.projectId}/spiders/${this.spiderId}/jobs/create`}
                                            >
                                                <Button className="create-new-job">Create New Job</Button>
                                            </Link>
                                            <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}/cronjobs`}>
                                                <Button className="create-new-job">Go to Cronjobs</Button>
                                            </Link>
                                        </Content>
                                    )}
                                    {pageTab === "settings" && <Content>Settings</Content>}
                                </Content>
                            </Layout>
                        ) : (
                            <Spin />
                        )}
                    </Content>
                </Layout>
            </Layout>
        );
    }
}
