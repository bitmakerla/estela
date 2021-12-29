import React, { Component, ReactElement } from "react";
import { Link } from "react-router-dom";
import { Layout, Pagination, Typography, Button, Row, Space, Table, Tag } from "antd";
import { RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import {
    ApiProjectsSpidersCronjobsListRequest,
    ApiProjectsSpidersReadRequest,
    SpiderCronJob,
    Spider,
} from "../../services/api";
import { authNotification, resourceNotAllowedNotification, Header, ProjectSidenav, Spin } from "../../shared";
import { convertDateToString } from "../../utils";

const { Content } = Layout;
const { Text, Title } = Typography;

interface TagsData {
    name: string;
}

interface SpiderCronJobData {
    id: number | undefined;
    key: number | undefined;
    date: string;
    status: string | undefined;
    schedule: string | undefined;
    tags: TagsData[] | undefined;
}

interface CronjobListPageState {
    spiderName: string | undefined;
    cronjobs: SpiderCronJobData[];
    current: number;
    count: number;
    loaded: boolean;
}

interface RouteParams {
    projectId: string;
    spiderId: string;
}

export class CronJobListPage extends Component<RouteComponentProps<RouteParams>, CronjobListPageState> {
    PAGE_SIZE = 10;
    state: CronjobListPageState = {
        spiderName: "",
        cronjobs: [],
        count: 0,
        current: 0,
        loaded: false,
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    spiderId: string = this.props.match.params.spiderId;
    columns = [
        {
            title: "CronJob ID",
            dataIndex: "id",
            key: "id",
            render: (cronjobID: number): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}/cronjobs/${cronjobID}`}>
                    {cronjobID}
                </Link>
            ),
        },
        {
            title: "Date",
            dataIndex: "date",
            key: "date",
        },
        {
            title: "Schedule",
            key: "schedule",
            dataIndex: "schedule",
        },
        {
            title: "Tags",
            key: "tags",
            dataIndex: "tags",
            render: (Tags: TagsData[]): ReactElement => (
                <Space direction="horizontal">
                    {Tags.map((tag: TagsData, id) => (
                        <Tag key={id}>{tag.name}</Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: "Status",
            key: "status",
            dataIndex: "status",
        },
    ];

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            const requestParams: ApiProjectsSpidersReadRequest = { pid: this.projectId, sid: this.spiderId };
            this.apiService.apiProjectsSpidersRead(requestParams).then(
                async (response: Spider) => {
                    const data = await this.getProjectCronJobs(1);
                    const cronjobs: SpiderCronJobData[] = data.data;
                    this.setState({
                        spiderName: response.name,
                        cronjobs: [...cronjobs],
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

    getProjectCronJobs = async (
        page: number,
    ): Promise<{ data: SpiderCronJobData[]; count: number; current: number }> => {
        const requestParams: ApiProjectsSpidersCronjobsListRequest = {
            pid: this.projectId,
            page,
            sid: this.spiderId,
            pageSize: this.PAGE_SIZE,
        };
        const response = await this.apiService.apiProjectsSpidersCronjobsList(requestParams);
        const data = response.results.map((cronjob: SpiderCronJob, iterator: number) => ({
            key: iterator,
            id: cronjob.cjid,
            date: convertDateToString(cronjob.created),
            status: cronjob.status,
            schedule: cronjob.schedule,
            tags: cronjob.ctags,
        }));
        return { data, count: response.count, current: page };
    };

    onPageChange = async (page: number): Promise<void> => {
        this.setState({ loaded: false });
        await this.getProjectCronJobs(page);
    };

    render(): JSX.Element {
        const { loaded, cronjobs, count, current, spiderName } = this.state;
        return (
            <Layout className="general-container">
                <Header />
                <Layout className="white-background">
                    <ProjectSidenav projectId={this.projectId} />
                    <Content className="content-padding">
                        {loaded ? (
                            <Layout className="white-background">
                                <Content>
                                    <Title level={4} className="text-center">
                                        {spiderName}
                                    </Title>
                                    <Row justify="center" className="cronjob-list">
                                        <Space direction="vertical" size="large">
                                            <Text>
                                                <b>Spider ID:</b>&nbsp; {this.spiderId}
                                            </Text>
                                            <Text>
                                                <b>Project ID:</b>
                                                <Link to={`/projects/${this.projectId}`}>&nbsp; {this.projectId}</Link>
                                            </Text>
                                            <Table
                                                columns={this.columns}
                                                dataSource={cronjobs}
                                                pagination={false}
                                                size="middle"
                                                className="table"
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
                                    <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}/cronjobs/create`}>
                                        <Button className="create-new-job">Create New CronJob</Button>
                                    </Link>
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
