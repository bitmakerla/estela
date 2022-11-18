import React, { Component, ReactElement } from "react";
import {
    Layout,
    Typography,
    Row,
    Col,
    Card,
    Space,
    Tabs,
    Tag,
    Pagination,
    Table,
    Switch,
    Button,
    InputNumber,
    Radio,
    Checkbox,
} from "antd";
import { Link, RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import Copy from "../../assets/icons/copy.svg";
import Run from "../../assets/icons/play.svg";
import Edit from "../../assets/icons/edit.svg";
import Filter from "../../assets/icons/filter.svg";
import Setting from "../../assets/icons/setting.svg";
import {
    ApiProjectsSpidersCronjobsUpdateRequest,
    ApiProjectsSpidersCronjobsReadRequest,
    ApiProjectsSpidersJobsListRequest,
    ApiProjectsSpidersCronjobsRunOnceRequest,
    SpiderCronJob,
    SpiderJob,
    SpiderCronJobUpdateStatusEnum,
    SpiderCronJobDataStatusEnum,
    SpiderCronJobUpdate,
    SpiderCronJobUpdateDataStatusEnum,
} from "../../services/api";
import {
    authNotification,
    resourceNotAllowedNotification,
    incorrectDataNotification,
    Header,
    ProjectSidenav,
    Spin,
} from "../../shared";
import { convertDateToString } from "../../utils";

const { Content } = Layout;
const { Text } = Typography;

interface ArgsData {
    name: string;
    value: string;
}

interface EnvVarsData {
    name: string;
    value: string;
}

interface TagsData {
    name: string;
}

interface SpiderJobData {
    id: number | undefined;
    key: number | undefined;
    date: string;
    status: string | undefined;
    cronjob: number | null | undefined;
}

interface CronJobDetailPageState {
    loaded: boolean;
    name: string | undefined;
    args: ArgsData[];
    envVars: EnvVarsData[];
    tags: TagsData[];
    status: string | undefined;
    jobs: SpiderJobData[];
    count: number;
    current: number;
    schedule: string | undefined;
    unique_collection: boolean | undefined;
    new_schedule: string | undefined;
    dataStatus: string | undefined;
    dataExpiryDays: number | null | undefined;
    loading_status: boolean;
    modified: boolean;
}

interface RouteParams {
    projectId: string;
    spiderId: string;
    cronjobId: string;
}

export class CronJobDetailPage extends Component<RouteComponentProps<RouteParams>, CronJobDetailPageState> {
    PAGE_SIZE = 10;
    initial_schedule = "";
    state = {
        loaded: false,
        name: "",
        args: [],
        envVars: [],
        tags: [],
        jobs: [],
        status: "",
        schedule: "",
        unique_collection: false,
        new_schedule: "",
        count: 0,
        current: 0,
        dataStatus: "",
        dataExpiryDays: 0,
        loading_status: false,
        modified: false,
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    spiderId: string = this.props.match.params.spiderId;
    cronjobId: number = parseInt(this.props.match.params.cronjobId);

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

    items = [
        { key: "Sche-Job ID", value: "1" },
        { key: "Sche-Job ID", value: "1" },
    ];

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            const requestParams: ApiProjectsSpidersCronjobsReadRequest = {
                pid: this.projectId,
                sid: this.spiderId,
                cjid: this.cronjobId,
            };
            this.apiService.apiProjectsSpidersCronjobsRead(requestParams).then(
                async (response: SpiderCronJob) => {
                    let args = response.cargs;
                    if (args === undefined) {
                        args = [];
                    }
                    let envVars = response.cenvVars;
                    if (envVars === undefined) {
                        envVars = [];
                    }
                    let tags = response.ctags;
                    if (tags === undefined) {
                        tags = [];
                    }
                    this.initial_schedule = response.schedule || "";
                    const data = await this.getJobs(1);
                    const jobs: SpiderJobData[] = data.data;
                    this.setState({
                        name: response.name,
                        args: [...args],
                        envVars: [...envVars],
                        tags: [...tags],
                        status: response.status,
                        schedule: response.schedule,
                        unique_collection: response.uniqueCollection,
                        jobs: [...jobs],
                        count: data.count,
                        current: data.current,
                        dataStatus: response.dataStatus,
                        dataExpiryDays: response.dataExpiryDays == null ? 1 : response.dataExpiryDays,
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

    handleInputChange = (event: string): void => {
        this.setState({ new_schedule: event });
        this.updateSchedule(event);
    };

    updateSchedule = (_schedule: string): void => {
        const requestData: SpiderCronJobUpdate = {
            schedule: _schedule,
        };
        const request: ApiProjectsSpidersCronjobsUpdateRequest = {
            cjid: this.cronjobId,
            pid: this.projectId,
            sid: this.spiderId,
            data: requestData,
        };
        this.apiService.apiProjectsSpidersCronjobsUpdate(request).then(
            (response: SpiderCronJobUpdate) => {
                this.setState({ schedule: response.schedule });
            },
            (error: unknown) => {
                console.log(error);
                incorrectDataNotification();
            },
        );
    };

    updateDataExpiry = (): void => {
        this.setState({ loading_status: true });
        const requestData: SpiderCronJobUpdate = {
            dataStatus:
                this.state.dataStatus == SpiderCronJobUpdateDataStatusEnum.Persistent
                    ? this.state.dataStatus
                    : SpiderCronJobUpdateDataStatusEnum.Pending,
            dataExpiryDays: this.state.dataExpiryDays,
        };
        const request: ApiProjectsSpidersCronjobsUpdateRequest = {
            cjid: this.cronjobId,
            pid: this.projectId,
            sid: this.spiderId,
            data: requestData,
        };
        this.apiService.apiProjectsSpidersCronjobsUpdate(request).then(
            (response: SpiderCronJobUpdate) => {
                this.setState({
                    dataStatus: response.dataStatus,
                    dataExpiryDays: response.dataExpiryDays,
                    modified: false,
                    loading_status: false,
                });
            },
            (error: unknown) => {
                console.log(error);
                incorrectDataNotification();
            },
        );
    };

    getJobs = async (page: number): Promise<{ data: SpiderJobData[]; count: number; current: number }> => {
        const requestParams: ApiProjectsSpidersJobsListRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            page,
            pageSize: this.PAGE_SIZE,
            cronjob: this.cronjobId,
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
        const data = await this.getJobs(page);
        const jobs: SpiderJobData[] = data.data;
        this.setState({
            jobs: [...jobs],
            count: data.count,
            current: data.current,
            loaded: true,
        });
    };

    onChangeData = (): void => {
        const _dataStatus =
            this.state.dataStatus == SpiderCronJobUpdateDataStatusEnum.Persistent
                ? SpiderCronJobUpdateDataStatusEnum.Pending
                : SpiderCronJobUpdateDataStatusEnum.Persistent;
        this.setState({ dataStatus: _dataStatus, modified: true });
    };

    onChangeDay = (value: number | null): void => {
        this.setState({ dataExpiryDays: value, modified: true });
    };

    runOnce = (): void => {
        const requestParams: ApiProjectsSpidersCronjobsRunOnceRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            cjid: this.cronjobId,
        };
        this.apiService.apiProjectsSpidersCronjobsRunOnce(requestParams).then(
            async (response: SpiderCronJob) => {
                console.log(response);
                const data = await this.getJobs(1);
                const jobs: SpiderJobData[] = data.data;
                this.setState({ jobs: [...jobs] });
            },
            (error: unknown) => {
                console.log(error);
            },
        );
    };

    updateStatus = (): void => {
        this.setState({ loading_status: true });
        const _status =
            this.state.status == SpiderCronJobUpdateStatusEnum.Disabled
                ? SpiderCronJobUpdateStatusEnum.Active
                : SpiderCronJobUpdateStatusEnum.Disabled;
        const request: ApiProjectsSpidersCronjobsUpdateRequest = {
            cjid: this.cronjobId,
            sid: this.spiderId,
            pid: this.projectId,
            data: {
                status: _status,
                schedule: this.state.schedule,
            },
        };
        this.apiService.apiProjectsSpidersCronjobsUpdate(request).then(
            (response) => {
                this.setState({ status: response.status, loading_status: false });
                console.log("Everything is gona be okay");
            },
            (error: unknown) => {
                console.log(error);
                incorrectDataNotification();
            },
        );
    };

    overview = (
        <>
            <Content className="grid lg:grid-cols-2 grid-cols-1 gap-4 items-start w-full">
                <Card style={{ width: 400, borderRadius: "8px" }} bordered={false}>
                    <Space direction="horizontal" className="flow-root items-center mx-4 w-full">
                        <Text className="float-left py-2 text-estela-black-medium font-medium text-base">PERIOD</Text>
                        <Button
                            icon={<Edit className="flex h-6 w-6" />}
                            size="large"
                            className="float-right stroke-estela-blue-full border-none"
                        ></Button>
                    </Space>
                    <Space direction="vertical" className="mx-4">
                        <Text>Launch date</Text>
                        <Text>01/01/2023, 11:30 PM</Text>
                        <Text>Repeat every</Text>
                        <Text className="text-sm">Weekly on Saturday, Monday, Wednesday</Text>
                        <Text>Next launch: 01/02/2023, 11:30 PM</Text>
                    </Space>
                </Card>
                <Card className="bg-yellow-100" style={{ borderRadius: "8px" }} bordered={false}>
                    <Text className="py-2 m-4 text-estela-black-medium font-medium text-base">DETAILS</Text>
                    <Row className="grid grid-cols-3 py-1 px-4">
                        <Col>Sche-Job ID</Col>
                        <Col>01</Col>
                    </Row>
                    <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-4 rounded-lg">
                        <Col>Spider</Col>
                        <Col>My Spider</Col>
                    </Row>
                    <Row className="grid grid-cols-3 py-1 px-4">
                        <Col className="col-span-1">Project ID</Col>
                        <Col className="col-span-2">d6d92510-9d5d-4add-b803-b896c5e21f55</Col>
                    </Row>
                    <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-4 rounded-lg">
                        <Col>Creation date</Col>
                        <Col>16:23:00 09-13-2022</Col>
                    </Row>
                    <Row className="grid grid-cols-3 py-1 px-4">
                        <Col>Tags</Col>
                        <Col>scraping, my_tag</Col>
                    </Row>
                    <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-4 rounded-lg">
                        <Col>Environment variables</Col>
                        <Col>API_KEY=412dea23</Col>
                    </Row>
                    <Row className="grid grid-cols-3 py-1 px-4">
                        <Col>Arguments</Col>
                        <Col>job_type=products</Col>
                    </Row>
                </Card>
            </Content>
            <Content className="my-4">
                <Row className="flow-root">
                    <Text className="float-left text-estela-black-full font-medium text-2xl">Associated jobs</Text>
                    <a className="float-right py-1 px-2 text-estela-blue-full text-base font-medium hover:text-estela-blue-full hover:bg-estela-blue-low rounded-lg">
                        See all
                    </a>
                </Row>
                <Content className="m-2 flex items-start w-full">
                    <Col className="float-left px-4 mx-2 bg-green-100 w-full">
                        <Space className="flow-root">
                            <Text className="text-estela-black-medium float-left py-1 font-medium text-lg">
                                In queue
                            </Text>
                            <Content className="float-right flex">
                                <Button
                                    disabled={true}
                                    icon={<Filter className="h-6 w-6 mr-2" />}
                                    size="large"
                                    className="flex items-center stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                >
                                    Filter
                                </Button>
                                <Button
                                    icon={<Setting className="h-6 w-6" />}
                                    size="large"
                                    className="flex items-center justify-center stroke-estela-black-medium border-none hover:stroke-estela bg-white"
                                ></Button>
                            </Content>
                        </Space>
                    </Col>
                    <Col className="float-right bg-red-100 rounded-lg w-48">
                        <Content className="my-2 mx-3">
                            <Text className="text-estela-black-medium font-medium text-xs">STATUS</Text>
                            <Content className="my-2">
                                <Checkbox defaultChecked={false}>In queue</Checkbox>
                                <br />
                                <Checkbox defaultChecked>Running</Checkbox>
                                <br />
                                <Checkbox defaultChecked>Completed</Checkbox>
                            </Content>
                        </Content>
                    </Col>
                </Content>
            </Content>
        </>
    );

    dataPersistence = (
        <>
            <Content>
                <Row className="bg-white rounded-lg">
                    <div className="lg:m-8 md:mx-6 m-4">
                        <p className="text-2xl text-black">Data persistence</p>
                        <p className="text-sm my-2 text-estela-black-medium">
                            Data persistence will be applied to all jobs creadted from this schedue job by default.
                        </p>
                        <Content>
                            <Radio.Group className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 lg:my-6 my-4">
                                <Radio.Button
                                    value="1 day"
                                    // onClick={() => {
                                    //     this.handlePersistenceChange("1 day");
                                    // }}
                                >
                                    1 day
                                </Radio.Button>
                                <Radio.Button
                                    value="1 week"
                                    // onClick={() => {
                                    //     this.handlePersistenceChange("1 week");
                                    // }}
                                >
                                    1 week
                                </Radio.Button>
                                <Radio.Button
                                    value="1 month"
                                    // onClick={() => {
                                    //     this.handlePersistenceChange("1 month");
                                    // }}
                                >
                                    1&nbsp;month
                                </Radio.Button>
                                <Radio.Button
                                    value="3 months"
                                    // onClick={() => {
                                    //     this.handlePersistenceChange("3 months");
                                    // }}
                                >
                                    3&nbsp;months
                                </Radio.Button>
                                <Radio.Button
                                    value="6 months"
                                    // onClick={() => {
                                    //     this.handlePersistenceChange("6 months");
                                    // }}
                                >
                                    6&nbsp;months
                                </Radio.Button>
                                <Radio.Button
                                    value="1 year"
                                    // onClick={() => {
                                    //     this.handlePersistenceChange("1 year");
                                    // }}
                                >
                                    1 year
                                </Radio.Button>
                                <Radio.Button
                                    value="forever"
                                    // onClick={() => {
                                    //     this.handlePersistenceChange("forever");
                                    // }}
                                >
                                    Forever
                                </Radio.Button>
                            </Radio.Group>
                        </Content>
                        <div className="h-12 w-72">
                            <Button
                                block
                                // disabled={!persistenceChanged}
                                htmlType="submit"
                                className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-base  min-h-full"
                            >
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </Row>
            </Content>
        </>
    );

    render(): JSX.Element {
        const {
            loaded,
            args,
            envVars,
            tags,
            status,
            count,
            current,
            jobs,
            schedule,
            unique_collection,
            dataStatus,
            dataExpiryDays,
            loading_status,
            modified,
        } = this.state;
        return (
            <Layout className="general-container">
                <Header />
                <Layout className="bg-white">
                    <ProjectSidenav projectId={this.projectId} path={"/cronjobs"} />
                    <Content>
                        {loaded ? (
                            <Layout className="bg-white">
                                <Content className="bg-metal rounded-2xl">
                                    <Row className="flow-root lg:mx-10 mx-6 mb-6">
                                        <Col className="float-left">
                                            <Text className="text-estela-black-medium font-medium text-xl">
                                                Sche-Job-{this.cronjobId}
                                            </Text>
                                        </Col>
                                        <Col className="float-right flex">
                                            <Button
                                                icon={<Copy className="h-6 w-6 mr-2 text-sm" />}
                                                size="large"
                                                className="flex items-center mr-2 stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                            >
                                                Clone
                                            </Button>
                                            <Button
                                                icon={<Run className="h-6 w-6 mr-2 text-sm" />}
                                                size="large"
                                                className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                            >
                                                Run once
                                            </Button>
                                        </Col>
                                    </Row>
                                    <Row className="lg:mx-10 mx-6">
                                        <Tabs
                                            size="middle"
                                            defaultActiveKey={"1"}
                                            items={[
                                                {
                                                    label: "Overview",
                                                    key: "1",
                                                    children: this.overview,
                                                },
                                                {
                                                    label: "Data persistence",
                                                    key: "2",
                                                    children: this.dataPersistence,
                                                },
                                            ]}
                                        />
                                    </Row>
                                    <Row justify="center" className="cronjob-data">
                                        <Space direction="vertical" size="large">
                                            <Text>
                                                <b>CronJob ID:</b>&nbsp; {this.cronjobId}
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
                                                <b>Active:</b>&nbsp;
                                                <Switch
                                                    loading={loading_status}
                                                    defaultChecked={status == SpiderCronJobUpdateStatusEnum.Active}
                                                    onChange={this.updateStatus}
                                                />
                                            </Text>
                                            <Text
                                                editable={{
                                                    tooltip: "click to edit text",
                                                    onChange: this.handleInputChange,
                                                }}
                                            >
                                                <b>Schedule:</b>&nbsp; {schedule}
                                            </Text>
                                            <Text>
                                                <Space direction="vertical">
                                                    <Space direction="horizontal">
                                                        <b>Data Persistent:</b>
                                                        <Switch
                                                            loading={loading_status}
                                                            defaultChecked={
                                                                dataStatus == SpiderCronJobDataStatusEnum.Persistent
                                                            }
                                                            onChange={this.onChangeData}
                                                        />
                                                    </Space>
                                                    <Space direction="horizontal">
                                                        <Text
                                                            disabled={
                                                                dataStatus == SpiderCronJobDataStatusEnum.Persistent
                                                            }
                                                        >
                                                            <b>Days :</b>&nbsp;
                                                            <InputNumber
                                                                size="small"
                                                                min={1}
                                                                max={720}
                                                                defaultValue={dataExpiryDays}
                                                                style={{ width: "62px" }}
                                                                disabled={
                                                                    dataStatus == SpiderCronJobDataStatusEnum.Persistent
                                                                }
                                                                onChange={this.onChangeDay}
                                                            />
                                                        </Text>
                                                    </Space>
                                                    {modified && (
                                                        <Button
                                                            type="primary"
                                                            onClick={this.updateDataExpiry}
                                                            size="small"
                                                            loading={loading_status}
                                                        >
                                                            Save
                                                        </Button>
                                                    )}
                                                </Space>
                                            </Text>
                                            <Text>
                                                <b>Unique Collection:</b>&nbsp;
                                                {unique_collection ? "Yes" : "No"}
                                            </Text>
                                            <Space direction="vertical">
                                                <b>Arguments</b>
                                                {args.map((arg: ArgsData, id) => (
                                                    <Tag key={id}>
                                                        {arg.name}: {arg.value}
                                                    </Tag>
                                                ))}
                                            </Space>
                                            <Space direction="vertical">
                                                <b>Environment variables</b>
                                                {envVars.map((envVar: EnvVarsData, id) => (
                                                    <Tag key={id}>
                                                        {envVar.name}: {envVar.value}
                                                    </Tag>
                                                ))}
                                            </Space>
                                            <Space direction="vertical">
                                                <b>Tags</b>
                                                <Space direction="horizontal">
                                                    {tags.map((tag: TagsData, id) => (
                                                        <Tag key={id}>{tag.name}</Tag>
                                                    ))}
                                                </Space>
                                            </Space>
                                            <Button type="primary" className="go-to-spiders" onClick={this.runOnce}>
                                                Run once
                                            </Button>
                                        </Space>
                                    </Row>
                                    <Row justify="center" className="cronjob-data">
                                        <Space direction="vertical" size="large">
                                            <Table columns={this.columns} dataSource={jobs} pagination={false} />
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
