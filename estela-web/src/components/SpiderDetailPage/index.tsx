import React, { Component, ReactElement } from "react";
import { Button, Layout, Pagination, Typography, Row, Space, Table, Col, Tabs, Radio, Checkbox } from "antd";
import { RouteComponentProps, Link } from "react-router-dom";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import Add from "../../assets/icons/add.svg";
import Play from "../../assets/icons/play.svg";
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
    optionTab: string;
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
        optionTab: "overview",
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

    onDetailMenuTabChange = (option: string) => {
        this.setState({
            optionTab: option,
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
        const { loaded, name, jobs, count, current, optionTab } = this.state;
        return (
            <Layout className="general-container">
                <Header />
                <Layout className="white-background">
                    <ProjectSidenav projectId={this.projectId} path={"/spiders"} />
                    <Content className="bg-metal rounded-2xl">
                        {loaded ? (
                            <Layout className="white-background">
                                <Content className="bg-metal rounded-2xl">
                                    <div className="lg:m-10 md:mx-6 mx-2">
                                        <Row className="flow-root my-6 space-x-4">
                                            <Col className="float-left">
                                                <Text className="text-[#6C757D] text-xl">My Spider</Text>
                                            </Col>
                                            <Col className="float-right">
                                                <Button
                                                    icon={<Add className="mr-2" width={19} />}
                                                    size="large"
                                                    className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                                >
                                                    Schedule new job
                                                </Button>
                                            </Col>
                                            <Col className="float-right">
                                                <Button
                                                    icon={<Play className="mr-2" width={19} />}
                                                    size="large"
                                                    className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                                >
                                                    Run new job
                                                </Button>
                                            </Col>
                                        </Row>
                                        <Tabs
                                            defaultActiveKey={this.state.optionTab}
                                            onChange={this.onDetailMenuTabChange}
                                            items={[
                                                {
                                                    label: "Overview",
                                                    key: "overview",
                                                },
                                                {
                                                    label: "Settings",
                                                    key: "settings",
                                                },
                                            ]}
                                        />
                                        {optionTab === "overview" && (
                                            <>
                                                <Row className="my-6 grid grid-cols-4 text-base h-full">
                                                    <Layout className="bg-metal col-span-1 h-44">
                                                        <Content className="white-background mr-5 p-3 rounded-lg">
                                                            <p className="text-base text-silver p-2">SCHEDULED JOBS</p>
                                                            <p className="text-xl font-bold p-2 leading-8">2</p>
                                                        </Content>
                                                    </Layout>
                                                    <Layout className="bg-metal col-span-1 h-44">
                                                        <Content className="white-background mr-5 p-3 rounded-lg">
                                                            <p className="text-base text-silver p-2">JOBS</p>
                                                            <p className="text-xl font-bold p-2 leading-8">2</p>
                                                        </Content>
                                                    </Layout>
                                                    <Layout className="bg-metal col-span-2 h-44">
                                                        <Content className="white-background mr-5 p-3 rounded-lg">
                                                            <p className="text-base text-silver p-2">DETAILS</p>
                                                            <div className="grid grid-cols-3 p-2 rounded-lg">
                                                                <div className="col-span-1">
                                                                    <p className="text-sm font-bold">Spider ID</p>
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <p className="text-sm text-silver">01</p>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-3 p-2 bg-[#F6FAFD] rounded-lg">
                                                                <div className="col-span-1">
                                                                    <p className="text-sm font-bold">Project ID</p>
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <p className="text-sm text-silver">
                                                                        e0cfa47f-2cfe-4070-bedf-78d2e45287f0
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-3 p-2 rounded-lg">
                                                                <div className="col-span-1">
                                                                    <p className="text-sm font-bold">Creation date</p>
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <p className="text-sm text-silver">
                                                                        16:23:00 09-13-2022
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </Content>
                                                    </Layout>
                                                </Row>
                                                <Row className="my-6 grid grid-cols-9 text-base h-full">
                                                    <Layout className="bg-metal col-span-7 h-44">
                                                        <Content className="white-background mr-5 p-3 rounded-lg">
                                                            <p className="text-base text-silver p-2">STATUS</p>
                                                            <p className="text-xl font-bold p-2 leading-8">2</p>
                                                        </Content>
                                                    </Layout>
                                                    <Layout className="bg-metal col-span-2 h-44">
                                                        <Content className="white-background mr-5 p-3 rounded-lg">
                                                            <p className="text-xs text-silver p-2">STATUS</p>
                                                            <div className="grid grid-cols-3">
                                                                <div className="col-span-2">
                                                                    <Checkbox>
                                                                        <p className="text-sm">In queue</p>
                                                                    </Checkbox>
                                                                </div>
                                                                <div className="col-span-1">
                                                                    <p className="text-xs text-[#9BA2A8]">10</p>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-3">
                                                                <div className="col-span-2">
                                                                    <Checkbox>Running</Checkbox>
                                                                </div>
                                                                <div className="col-span-1">
                                                                    <p>10</p>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-3">
                                                                <div className="col-span-2">
                                                                    <Checkbox>Completed</Checkbox>
                                                                </div>
                                                                <div className="col-span-1">
                                                                    <p>10</p>
                                                                </div>
                                                            </div>
                                                        </Content>
                                                    </Layout>
                                                </Row>
                                                <Row justify="center" className="bg-white rounded-lg">
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
                                                        <Link
                                                            to={`/projects/${this.projectId}/spiders/${this.spiderId}/cronjobs`}
                                                        >
                                                            <Button className="create-new-job">Go to Cronjobs</Button>
                                                        </Link>
                                                    </Content>
                                                </Row>
                                            </>
                                        )}
                                        {optionTab === "settings" && (
                                            <Row justify="center" className="bg-white rounded-lg">
                                                <Content className="content-padding">
                                                    <Row className="bg-white rounded-lg my-4">
                                                        <Col span={24}>
                                                            <div className="lg:m-8 md:mx-6 m-4">
                                                                <p className="text-2xl text-black">Data persistence</p>
                                                                <p className="text-sm my-2 text-estela-black-medium">
                                                                    Data persistence will be applied to all jobs and
                                                                    scheduled jobs by default.
                                                                </p>
                                                                <Row align="middle">
                                                                    <Col xs={24} sm={24} md={24} lg={5}>
                                                                        <p className="text-sm my-2 text-[#212529]">
                                                                            General Data Persistent
                                                                        </p>
                                                                    </Col>
                                                                    <Col xs={24} sm={24} md={24} lg={19}>
                                                                        <Radio.Group className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 lg:my-6 my-4">
                                                                            <Radio.Button value="1 day">
                                                                                1 day
                                                                            </Radio.Button>
                                                                            <Radio.Button value="1 week">
                                                                                1 week
                                                                            </Radio.Button>
                                                                            <Radio.Button value="1 month">
                                                                                1&nbsp;month
                                                                            </Radio.Button>
                                                                            <Radio.Button value="3 months">
                                                                                3&nbsp;months
                                                                            </Radio.Button>
                                                                            <Radio.Button value="6 months">
                                                                                6&nbsp;months
                                                                            </Radio.Button>
                                                                            <Radio.Button value="1 year">
                                                                                1 year
                                                                            </Radio.Button>
                                                                            <Radio.Button value="forever">
                                                                                Forever
                                                                            </Radio.Button>
                                                                        </Radio.Group>
                                                                    </Col>
                                                                </Row>
                                                                <div className="h-12 w-3/5">
                                                                    <Button
                                                                        block
                                                                        htmlType="submit"
                                                                        disabled
                                                                        className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-base min-h-full"
                                                                    >
                                                                        Save Changes
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </Col>
                                                    </Row>
                                                </Content>
                                            </Row>
                                        )}
                                    </div>
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
