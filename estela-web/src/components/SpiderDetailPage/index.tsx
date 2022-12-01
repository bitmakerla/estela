import React, { Component, ReactElement } from "react";
import { Button, Layout, Pagination, Typography, Row, Space, Table, Col, Tabs, Radio, Checkbox } from "antd";
import { RouteComponentProps, Link } from "react-router-dom";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import Add from "../../assets/icons/add.svg";
import Play from "../../assets/icons/play.svg";
import Setting from "../../assets/icons/setting.svg";
import Filter from "../../assets/icons/filter.svg";

import {
    ApiProjectsSpidersReadRequest,
    ApiProjectsSpidersJobsListRequest,
    Spider,
    SpiderJob,
    SpiderJobArg,
    SpiderJobTag,
} from "../../services/api";
import { authNotification, resourceNotAllowedNotification, Header, ProjectSidenav, Spin } from "../../shared";
// import { convertDateToString } from "../../utils";

const { Content } = Layout;
const { Text } = Typography;

interface SpiderJobData {
    id: number | null | undefined;
    key: number | null | undefined;
    spider: number | null | undefined;
    jobStatus: string | null | undefined;
    cronjob: number | null | undefined;
    args: SpiderJobArg[] | undefined;
    tags: SpiderJobTag[] | undefined;
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
    center = "center";
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
            title: "JOB",
            dataIndex: "id",
            key: "id",
            render: (jobID: number): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}/jobs/${jobID}`}>Job-{jobID}</Link>
            ),
        },
        {
            title: "SPIDER",
            dataIndex: "spider",
            key: "spider",
            render: (spiderID: number): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}`}>Spider-{spiderID}</Link>
            ),
        },
        {
            title: "SCHEDULED JOB",
            dataIndex: "cronjob",
            key: "cronjob",
            render: (cronjob: number): ReactElement =>
                cronjob ? (
                    <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}/cronjobs/${cronjob}`}>
                        {cronjob}
                    </Link>
                ) : (
                    <span className="text-xs text-[#6C757D]">Not associated</span>
                ),
        },
        {
            title: "ARGUMENTS",
            dataIndex: "args",
            key: "args",
            render: (args: SpiderJobArg[]): ReactElement =>
                args.length !== 0 ? (
                    <>
                        {args.map((arg, index) => {
                            return (
                                <span key={index} className="text-xs text-[#6C757D]">
                                    {arg.name}={arg.value}
                                </span>
                            );
                        })}
                    </>
                ) : (
                    <div></div>
                ),
        },
        {
            title: "TAGS",
            dataIndex: "tags",
            key: "tags",
            render: (tags: SpiderJobTag[]): ReactElement =>
                tags.length !== 0 ? (
                    <>
                        {tags.map((tag, index) => {
                            return (
                                <span key={index} className="text-xs text-[#6C757D]">
                                    {tag.name}
                                </span>
                            );
                        })}
                    </>
                ) : (
                    <div></div>
                ),
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
            spider: job.spider,
            args: job.args,
            tags: job.tags,
            jobStatus: job.jobStatus,
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
        console.log(jobs);
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
                                                <Text className="text-[#6C757D] text-xl">{name}</Text>
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
                                            defaultActiveKey={optionTab}
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
                                                            <p className="text-xl font-bold p-2 leading-8">
                                                                {jobs.length}
                                                            </p>
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
                                                                    <p className="text-sm text-silver">
                                                                        {this.spiderId}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-3 p-2 bg-[#F6FAFD] rounded-lg">
                                                                <div className="col-span-1">
                                                                    <p className="text-sm font-bold">Project ID</p>
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <p className="text-sm text-silver">
                                                                        {this.projectId}
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
                                                        <Space direction="vertical">
                                                            <Content className="white-background mr-5 p-3 rounded-lg">
                                                                <Row
                                                                    className="flow-root my-6 space-x-4"
                                                                    align="middle"
                                                                >
                                                                    <Col className="float-left">
                                                                        <Text className="text-base text-silver align-middle">
                                                                            Running
                                                                        </Text>
                                                                    </Col>
                                                                    <Col className="float-left">
                                                                        <div className="bg-[#F9F9F9] text-[#9BA2A8] px-2 rounded-full">
                                                                            <span className="text-xs align-middle">
                                                                                100
                                                                            </span>
                                                                        </div>
                                                                    </Col>
                                                                    <Col className="float-right">
                                                                        <button className="align-middle">
                                                                            <Setting
                                                                                className="mr-2 w-5 h-5"
                                                                                width={19}
                                                                                stroke="#6C757D"
                                                                            />
                                                                        </button>
                                                                    </Col>
                                                                    <Col className="float-right">
                                                                        <Button
                                                                            icon={
                                                                                <Filter
                                                                                    className="mr-2 stroke-[#4D47C3]"
                                                                                    width={19}
                                                                                    stroke="#4D47C3"
                                                                                />
                                                                            }
                                                                            className="flex items-center border-[#F6FAFD] bg-[#F6FAFD] text-[#4D47C3] hover:text-estela text-sm hover:border-estela rounded-3xl"
                                                                        >
                                                                            <span className="align-middle">Filter</span>
                                                                        </Button>
                                                                    </Col>
                                                                </Row>
                                                                <Table
                                                                    tableLayout="fixed"
                                                                    className="rounded-2xl"
                                                                    rowSelection={{
                                                                        type: "checkbox",
                                                                    }}
                                                                    columns={this.columns}
                                                                    dataSource={jobs}
                                                                    pagination={false}
                                                                    size="middle"
                                                                    scroll={{ x: "max-content" }}
                                                                />
                                                            </Content>
                                                        </Space>
                                                    </Layout>
                                                    <Layout className="bg-metal col-span-2 h-44">
                                                        <Content className="white-background mr-5 p-3 rounded-lg">
                                                            <p className="text-xs text-silver">STATUS</p>
                                                            <Row align="middle" className="grid grid-cols-3">
                                                                <Col className="col-span-2">
                                                                    <Checkbox>
                                                                        <span className="text-xs">In queue</span>
                                                                    </Checkbox>
                                                                </Col>
                                                                <Col className="col-span-1">
                                                                    <span className="text-xs text-[#9BA2A8]">10</span>
                                                                </Col>
                                                            </Row>
                                                            <Row align="middle" className="grid grid-cols-3">
                                                                <div className="col-span-2">
                                                                    <Checkbox>
                                                                        <span className="text-xs">Running</span>
                                                                    </Checkbox>
                                                                </div>
                                                                <div className="col-span-1">
                                                                    <span className="text-xs text-[#9BA2A8]">10</span>
                                                                </div>
                                                            </Row>
                                                            <div className="grid grid-cols-3">
                                                                <div className="col-span-2">
                                                                    <Checkbox>
                                                                        <span className="text-xs">Completed</span>
                                                                    </Checkbox>
                                                                </div>
                                                                <div className="col-span-1">
                                                                    <span className="text-xs text-[#9BA2A8]">10</span>
                                                                </div>
                                                            </div>
                                                        </Content>
                                                    </Layout>
                                                </Row>
                                                <Row justify="center" className="bg-white rounded-lg">
                                                    <Content>
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
