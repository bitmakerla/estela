import React, { Component } from "react";
import { Layout, Typography, Row, Space, Table } from "antd";
import { RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import {
    ApiProjectsSpidersReadRequest,
    ApiProjectsSpidersJobsListRequest,
    Spider,
    SpiderJob,
} from "../../services/api";
import { Header, ProjectSidenav, Spin } from "../../shared";

const { Content } = Layout;
const { Text, Title } = Typography;

interface SpiderJobData {
    id: number | undefined;
    key: number | undefined;
    date: string;
    jobType: string | undefined;
    status: string | undefined;
}

interface SpiderDetailPageState {
    name: string;
    jobs: SpiderJobData[];
    loaded: boolean;
}

interface RouteParams {
    projectId: string;
    spiderId: string;
}

export class SpiderDetailPage extends Component<RouteComponentProps<RouteParams>, SpiderDetailPageState> {
    page = 1;
    PAGE_SIZE = 30;
    state: SpiderDetailPageState = {
        name: "",
        jobs: [],
        loaded: false,
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    spiderId: string = this.props.match.params.spiderId;
    columns = [
        {
            title: "#",
            dataIndex: "key",
            key: "key",
        },
        {
            title: "Job ID",
            dataIndex: "id",
            key: "id",
        },
        {
            title: "Date",
            dataIndex: "date",
            key: "date",
        },
        {
            title: "Job Type",
            dataIndex: "jobType",
            key: "jobType",
        },
        {
            title: "Status",
            key: "status",
            dataIndex: "status",
        },
    ];

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            history.push("/login");
        } else {
            const requestParams: ApiProjectsSpidersReadRequest = { pid: this.projectId, sid: this.spiderId };
            this.apiService.apiProjectsSpidersRead(requestParams).then(
                async (response: Spider) => {
                    this.getSpiderJobs(this.page);
                    const jobs: SpiderJobData[] = await this.getSpiderJobs(this.page);
                    this.setState({ name: response.name, jobs: [...jobs], loaded: true });
                },
                (error: unknown) => {
                    console.error(error);
                    history.push("/login");
                },
            );
        }
    }

    completeDateInfo(data: number): string {
        if (data < 10) {
            return `0${data}`;
        }
        return data.toString();
    }

    convertDateToString(date: Date | undefined): string {
        if (date) {
            const yearUTC = date.getUTCFullYear();
            const monthUTC = this.completeDateInfo(date.getUTCMonth() + 1);
            const dayUTC = this.completeDateInfo(date.getUTCDate());
            const hourUTC = date.getUTCHours();
            const minutesUTC = this.completeDateInfo(date.getUTCMinutes());
            const secondsUTC = this.completeDateInfo(date.getUTCSeconds());
            return `${hourUTC}:${minutesUTC}:${secondsUTC} ${monthUTC}-${dayUTC}-${yearUTC}`;
        }
        return "";
    }

    async getSpiderJobs(page: number): Promise<SpiderJobData[]> {
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
            date: this.convertDateToString(job.created),
            jobType: job.jobType,
            status: job.jobStatus,
            schedule: job.schedule,
        }));
        return data;
    }

    render(): JSX.Element {
        const { loaded, name, jobs } = this.state;
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
                                        {name}
                                    </Title>
                                    <Row justify="center" className="spider-data">
                                        <Space direction="vertical" size="large">
                                            <Text>
                                                <b>Spider ID:</b>&nbsp; {this.spiderId}
                                            </Text>
                                            <Text>
                                                <b>Project ID:</b>&nbsp; {this.projectId}
                                            </Text>
                                            <Table columns={this.columns} dataSource={jobs} pagination={false} />
                                        </Space>
                                    </Row>
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
