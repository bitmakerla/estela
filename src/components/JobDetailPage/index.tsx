import React, { Component } from "react";
import { Layout, Typography, Row, Space, Tag } from "antd";
import { Link, RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { ApiProjectsSpidersJobsReadRequest, SpiderJob } from "../../services/api";
import { authNotification, resourceNotAllowedNotification, Header, ProjectSidenav, Spin } from "../../shared";
import { convertDateToString } from "../../utils";

const { Content } = Layout;
const { Text, Title } = Typography;

interface ArgsData {
    name: string;
    value: string;
}

interface JobDetailPageState {
    loaded: boolean;
    name: string | undefined;
    args: ArgsData[];
    date: string;
    type: string | undefined;
    schedule: string | undefined;
    status: string | undefined;
}

interface RouteParams {
    projectId: string;
    spiderId: string;
    jobId: string;
}

export class JobDetailPage extends Component<RouteComponentProps<RouteParams>, JobDetailPageState> {
    cronJob = "CRON_JOB";
    state: JobDetailPageState = {
        loaded: false,
        name: "",
        args: [],
        date: "",
        type: "",
        schedule: "",
        status: "",
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    spiderId: string = this.props.match.params.spiderId;
    jobId: string = this.props.match.params.jobId;

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            const requestParams: ApiProjectsSpidersJobsReadRequest = {
                pid: this.projectId,
                sid: this.spiderId,
                jid: this.jobId,
            };
            this.apiService.apiProjectsSpidersJobsRead(requestParams).then(
                async (response: SpiderJob) => {
                    let args = response.args;
                    if (args === undefined) {
                        args = [];
                    }
                    this.setState({
                        name: response.name,
                        args: [...args],
                        date: convertDateToString(response.created),
                        type: response.jobType,
                        status: response.jobStatus,
                        schedule: response.schedule,
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

    render(): JSX.Element {
        const { loaded, name, args, date, type, status, schedule } = this.state;
        return (
            <Layout className="general-container">
                <Header />
                <Layout className="white-background">
                    <ProjectSidenav projectId={this.projectId} />
                    <Content className="content-padding">
                        {loaded ? (
                            <Layout className="white-background">
                                <Content>
                                    <Title level={5} className="text-center">
                                        {name}
                                    </Title>
                                    <Row justify="center" className="spider-data">
                                        <Space direction="vertical" size="large">
                                            <Text>
                                                <b>Job ID:</b>&nbsp; {this.jobId}
                                            </Text>
                                            <Text>
                                                <b>Spider ID:</b>&nbsp;
                                                <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}`}>
                                                    {this.spiderId}
                                                </Link>
                                            </Text>
                                            <Text>
                                                <b>Project ID:</b>
                                                <Link to={`/projects/${this.projectId}`}>&nbsp; {this.projectId}</Link>
                                            </Text>
                                            <Text>
                                                <b>Date:</b>&nbsp; {date}
                                            </Text>
                                            <Text>
                                                <b>Job Type:</b>&nbsp; {type}
                                            </Text>
                                            <Text>
                                                <b>Status:</b>&nbsp; {status}
                                            </Text>
                                            {type === this.cronJob && (
                                                <Text>
                                                    <b>Schedule:</b>&nbsp; {schedule}
                                                </Text>
                                            )}
                                            <Space direction="vertical">
                                                <b>Arguments</b>
                                                {args.map((arg: ArgsData, id) => (
                                                    <Tag key={id}>
                                                        {arg.name}: {arg.value}
                                                    </Tag>
                                                ))}
                                            </Space>
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
