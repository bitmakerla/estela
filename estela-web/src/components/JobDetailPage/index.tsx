import React, { Component } from "react";
import moment from "moment";
import {
    Layout,
    Typography,
    Collapse,
    Row,
    Col,
    Space,
    Tag,
    Button,
    Switch,
    DatePicker,
    DatePickerProps,
    Tabs,
    Card,
    Modal,
    Select,
    Input,
} from "antd";
import type { RangePickerProps } from "antd/es/date-picker";
import { Link, RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import Copy from "../../assets/icons/copy.svg";
import Run from "../../assets/icons/play.svg";
import Pause from "../../assets/icons/pause.svg";
import Add from "../../assets/icons/add.svg";

import {
    ApiProjectsSpidersJobsReadRequest,
    SpiderJobUpdateStatusEnum,
    ApiProjectsSpidersJobsUpdateRequest,
    ApiProjectsSpidersJobsDataListRequest,
    ApiProjectsSpidersListRequest,
    SpiderJob,
    SpiderJobUpdate,
    SpiderJobUpdateDataStatusEnum,
    Spider,
} from "../../services/api";
import {
    authNotification,
    resourceNotAllowedNotification,
    incorrectDataNotification,
    Header,
    ProjectSidenav,
    invalidDataNotification,
    Spin,
} from "../../shared";
import { convertDateToString } from "../../utils";

const { Content } = Layout;
const { Text, Title } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

interface Dictionary {
    [Key: string]: string;
}

interface OptionDataPersistence {
    label: string;
    key: number;
    value: number;
}

// interface OptionDataRepeat {
//     label: string;
//     key: number;
//     value: string;
// }

interface ArgsData {
    name: string;
    value: string;
}

interface EnvVarsData {
    name: string;
    value: string;
}

interface Tags {
    name: string;
    key: number;
}

interface TagsData {
    name: string;
}

interface JobDetailPageState {
    loaded: boolean;
    name: string | undefined;
    lifespan: number | undefined;
    totalResponseBytes: number | undefined;
    args: ArgsData[];
    envVars: EnvVarsData[];
    tags: TagsData[];
    newArgName: string;
    newArgValue: string;
    newEnvVarName: string;
    newEnvVarValue: string;
    date: string;
    created: string | undefined;
    status: string | undefined;
    cronjob: number | undefined | null;
    stats: Dictionary;
    logs: string[];
    count: number;
    current: number;
    dataStatus: string | undefined;
    dataExpiryDays: number | undefined;
    loading_status: boolean;
    modified: boolean;
    modalStop: boolean;
    modalClone: boolean;
    spiders: Spider[];
    loadedSpiders: boolean;
    spiderName: string;
    newSpiderId: string;
    newDataExpireDays: number;
    newDataStatus: string;
    newTags: Tags[];
    newTagName: string;
    newArgs: ArgsData[];
}

interface RouteParams {
    projectId: string;
    spiderId: string;
    jobId: string;
}

export class JobDetailPage extends Component<RouteComponentProps<RouteParams>, JobDetailPageState> {
    PAGE_SIZE = 10;
    dataRequests = "requests";
    dataItems = "items";
    dataLogs = "logs";
    state: JobDetailPageState = {
        loaded: false,
        name: "",
        lifespan: 0,
        totalResponseBytes: 0,
        args: [],
        envVars: [],
        tags: [],
        date: "",
        created: "",
        status: "",
        cronjob: null,
        stats: {},
        logs: [],
        count: 0,
        current: 0,
        dataStatus: "",
        dataExpiryDays: 0,
        loading_status: false,
        modified: false,
        modalStop: false,
        modalClone: false,
        spiders: [],
        loadedSpiders: false,
        spiderName: "",
        newSpiderId: "",
        newDataExpireDays: 1,
        newDataStatus: "",
        newTagName: "",
        newTags: [],
        newArgs: [],
        newArgName: "",
        newArgValue: "",
        newEnvVarName: "",
        newEnvVarValue: "",
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    spiderId: string = this.props.match.params.spiderId;
    jobId: number = parseInt(this.props.match.params.jobId);
    newJobId: string = this.props.match.params.jobId;
    countKey = 0;

    dataPersistenceOptions = [
        { label: "1 day", key: 1, value: 1 },
        { label: "1 week", key: 2, value: 7 },
        { label: "1 month", key: 3, value: 30 },
        { label: "3 months", key: 4, value: 90 },
        { label: "6 months", key: 5, value: 180 },
        { label: "1 year", key: 6, value: 365 },
        { label: "Forever", key: 7, value: 720 },
    ];

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
                    const args = response.args || [];
                    const envVars = response.envVars || [];
                    const tags = response.tags || [];
                    const newTags: Tags[] = tags.map((jobTag: TagsData, index: number) => ({
                        name: jobTag.name,
                        key: index,
                    }));
                    this.setState({
                        name: response.name,
                        lifespan: response.lifespan,
                        totalResponseBytes: response.totalResponseBytes,
                        args: [...args],
                        envVars: [...envVars],
                        tags: [...tags],
                        date: convertDateToString(response.created),
                        created: `${response.created}`,
                        status: response.jobStatus,
                        cronjob: response.cronjob,
                        loaded: true,
                        dataStatus: response.dataStatus,
                        dataExpiryDays: response.dataExpiryDays == null ? 1 : response.dataExpiryDays,
                        newTags: [...newTags],
                    });
                },
                (error: unknown) => {
                    console.error(error);
                    resourceNotAllowedNotification();
                },
            );
            this.getProjectSpiders();
        }
    }

    getProjectSpiders = async (): Promise<void> => {
        const requestParams: ApiProjectsSpidersListRequest = { pid: this.projectId };
        this.apiService.apiProjectsSpidersList(requestParams).then(
            (results) => {
                if (results.results.length == 0 || results.results == undefined) {
                    this.setState({ spiders: [], loadedSpiders: true });
                } else {
                    const spiderName = results.results.find(
                        (spider: Spider) => String(spider?.sid) === this.spiderId,
                    )?.name;
                    this.setState({
                        spiders: [...results.results],
                        spiderName: spiderName || "",
                        newSpiderId: String(results.results[0].sid),
                        loadedSpiders: true,
                    });
                }
            },
            (error: unknown) => {
                console.error(error);
                resourceNotAllowedNotification();
            },
        );
    };

    handlePersistenceChange = (value: number): void => {
        if (value == 720) {
            this.setState({ newDataStatus: "PERSISTENT" });
        } else {
            this.setState({ newDataExpireDays: value });
        }
    };

    handleRemoveTag = (id: number): void => {
        const newTags = [...this.state.newTags];
        newTags.splice(id, 1);
        this.setState({ newTags: [...newTags] });
    };

    handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const {
            target: { value, name },
        } = event;
        if (name === "newArgName") {
            this.setState({ newArgName: value });
        } else if (name === "newArgValue") {
            this.setState({ newArgValue: value });
        } else if (name === "newEnvVarName") {
            this.setState({ newEnvVarName: value });
        } else if (name === "newEnvVarValue") {
            this.setState({ newEnvVarValue: value });
        } else if (name === "newTagName") {
            this.setState({ newTagName: value });
        }
    };

    // addEnvVar = (): void => {
    //     const envVars = [...this.state.envVars];
    //     const newEnvVarName = this.state.newEnvVarName.trim();
    //     const newEnvVarValue = this.state.newEnvVarValue.trim();
    //     if (newEnvVarName && newEnvVarValue && newEnvVarName.indexOf(" ") == -1) {
    //         envVars.push({ name: newEnvVarName, value: newEnvVarValue, key: this.countKey++ });
    //         this.setState({ envVars: [...envVars], newEnvVarName: "", newEnvVarValue: "" });
    //     } else {
    //         invalidDataNotification("Invalid environment variable name/value pair.");
    //     }
    // };

    addTag = (): void => {
        const newTags = [...this.state.newTags];
        const newTagName = this.state.newTagName.trim();
        if (newTagName && newTagName.indexOf(" ") == -1) {
            newTags.push({ name: newTagName, key: this.countKey++ });
            this.setState({ newTags: [...newTags], newTagName: "" });
        } else {
            invalidDataNotification("Invalid tag name.");
        }
    };

    stopJob = (): void => {
        const request: ApiProjectsSpidersJobsUpdateRequest = {
            jid: this.jobId,
            sid: this.spiderId,
            pid: this.projectId,
            data: {
                jid: this.jobId,
                status: SpiderJobUpdateStatusEnum.Stopped,
            },
        };
        this.apiService.apiProjectsSpidersJobsUpdate(request).then(
            (response: SpiderJobUpdate) => {
                this.setState({ status: response.status });
            },
            (error: unknown) => {
                console.error(error);
                incorrectDataNotification();
            },
        );
    };

    updateDataExpiry = (): void => {
        this.setState({ loading_status: true });
        const requestData: SpiderJobUpdate = {
            dataStatus:
                this.state.dataStatus == SpiderJobUpdateDataStatusEnum.Persistent
                    ? this.state.dataStatus
                    : SpiderJobUpdateDataStatusEnum.Pending,
            dataExpiryDays: this.state.dataExpiryDays,
        };
        const request: ApiProjectsSpidersJobsUpdateRequest = {
            jid: this.jobId,
            pid: this.projectId,
            sid: this.spiderId,
            data: requestData,
        };
        this.apiService.apiProjectsSpidersJobsUpdate(request).then(
            (response: SpiderJobUpdate) => {
                this.setState({
                    dataStatus: response.dataStatus,
                    dataExpiryDays: response.dataExpiryDays == null ? 1 : response.dataExpiryDays,
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

    onChangeData = (): void => {
        const _dataStatus =
            this.state.dataStatus == SpiderJobUpdateDataStatusEnum.Persistent
                ? SpiderJobUpdateDataStatusEnum.Pending
                : SpiderJobUpdateDataStatusEnum.Persistent;
        this.setState({ dataStatus: _dataStatus, modified: true });
    };

    onChangeDay = (value: number): void => {
        this.setState({ dataExpiryDays: value, modified: true });
    };

    disabledDate: RangePickerProps["disabledDate"] = (current) => {
        return current && current < moment().endOf("day");
    };

    onChangeDate: DatePickerProps["onChange"] = (date) => {
        const days = moment.duration(moment(date, "llll").diff(moment(this.state.created, "llll"))).asDays();
        this.setState({ dataExpiryDays: days, modified: true });
    };

    getStats = (key: string | string[]): void => {
        if (key.length === 0) {
            return;
        }
        const requestParams: ApiProjectsSpidersJobsDataListRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            jid: this.newJobId,
            type: "stats",
        };
        this.apiService.apiProjectsSpidersJobsDataList(requestParams).then(
            (response) => {
                let data: Dictionary = {};
                if (response.results?.length) {
                    const safe_data: unknown[] = response.results ?? [];
                    data = safe_data[0] as Dictionary;
                    this.setState({ stats: data });
                }
            },
            (error: unknown) => {
                console.error(error);
                resourceNotAllowedNotification();
            },
        );
    };

    overview = (): React.ReactNode => {
        const { tags, envVars, args, date, spiderName, totalResponseBytes } = this.state;
        const radius = 100;
        const circunference: number = ((2 * 22) / 7) * radius;
        const storagePercentage = (totalResponseBytes || 0) * 1e-9;
        return (
            <>
                <Content className="grid lg:grid-cols-10 grid-cols-8 gap-2 items-start lg:w-full">
                    <Card className="w-full col-span-4 flex flex-col" style={{ borderRadius: "8px" }} bordered={false}>
                        <Text className="py-2 m-4 text-estela-black-medium font-medium text-base">Storage</Text>
                        <div className="grid w-full h-1/2 place-content-center">
                            <div className="flex items-center justify-center">
                                {/* ellipse here */}
                                <svg className="transform -rotate-90 w-72 h-72">
                                    <circle
                                        cx="144"
                                        cy="144"
                                        r={`${radius}`}
                                        stroke="currentColor"
                                        strokeWidth="5"
                                        fill="transparent"
                                        className="text-white"
                                    />

                                    <circle
                                        cx="144"
                                        cy="144"
                                        r={`${radius}`}
                                        stroke="currentColor"
                                        strokeWidth="5"
                                        fill="transparent"
                                        strokeDasharray={circunference}
                                        strokeDashoffset={circunference - storagePercentage * circunference}
                                        className="text-estela-states-green-medium"
                                    />
                                </svg>
                                <div className="absolute items-center justify-center">
                                    <span className="text-3xl text-center">{storagePercentage.toFixed(2)}</span>
                                    <br />
                                    <span className="text-lg text-center">of 1GB</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                    <Card className="w-full col-span-6 flex flex-col" style={{ borderRadius: "8px" }} bordered={false}>
                        <Text className="py-2 m-4 text-estela-black-medium font-medium text-base">DETAILS</Text>
                        <Row className="grid grid-cols-3 py-1 px-4 mt-4">
                            <Col>
                                <Text className="font-bold">Spider ID</Text>
                            </Col>
                            <Col>
                                <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}`}>{this.spiderId}</Link>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-4 rounded-lg">
                            <Col className="col-span-1">
                                <Text className="font-bold">Project ID</Text>
                            </Col>
                            <Col className="col-span-2">
                                <Link to={`/projects/${this.projectId}`}>{this.projectId}</Link>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 py-1 px-4">
                            <Col>
                                <Text className="font-bold">Creation date</Text>
                            </Col>
                            <Col>{date}</Col>
                        </Row>
                        <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-4 rounded-lg">
                            <Col>
                                <Text className="font-bold">Tags</Text>
                            </Col>
                            <Col>
                                <Space direction="horizontal">
                                    {tags.map((tag: TagsData, id) => (
                                        <Tag
                                            className="border-estela-blue-full bg-estela-blue-low text-estela-blue-full rounded-md"
                                            key={id}
                                        >
                                            {tag.name}
                                        </Tag>
                                    ))}
                                </Space>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 py-1 px-4">
                            <Col>
                                <Text className="font-bold">Environment variables</Text>
                            </Col>
                            <Col>
                                <Space direction="vertical">
                                    {envVars.map((envVar: EnvVarsData, id) => (
                                        <Tag
                                            className="border-estela-blue-full bg-estela-blue-low text-estela-blue-full rounded-md"
                                            key={id}
                                        >
                                            {envVar.name}: {envVar.value}
                                        </Tag>
                                    ))}
                                </Space>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-4 rounded-lg">
                            <Col>
                                <Text className="font-bold">Arguments</Text>
                            </Col>
                            <Col>
                                <Space direction="horizontal">
                                    {args.map((arg: ArgsData, id) => (
                                        <Tag
                                            className="border-estela-blue-full bg-estela-blue-low text-estela-blue-full rounded-md"
                                            key={id}
                                        >
                                            {arg.name}: {arg.value}
                                        </Tag>
                                    ))}
                                </Space>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 py-1 px-4">
                            <Col>
                                <Text className="font-bold">Spider</Text>
                            </Col>
                            <Col>
                                <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}`}>{spiderName}</Link>
                            </Col>
                        </Row>
                    </Card>
                </Content>
                <Content className="my-4 grid lg:grid-cols-10 grid-cols-8 gap-2 items-start lg:w-full">
                    <Card className="w-full col-span-2 flex flex-col" style={{ borderRadius: "8px" }} bordered={false}>
                        <Text className="py-2 m-4 text-estela-black-medium font-medium text-base">Bandwidth</Text>
                    </Card>
                    <Card className="w-full col-span-2 flex flex-col" style={{ borderRadius: "8px" }} bordered={false}>
                        <Text className="py-2 m-4 text-estela-black-medium font-medium text-base">Processing Time</Text>
                    </Card>
                    <Card className="w-full col-span-6 flex flex-col" style={{ borderRadius: "8px" }} bordered={false}>
                        <Text className="py-2 m-4 text-estela-black-medium font-medium text-base">Fields</Text>
                    </Card>
                </Content>
                <Content className="my-4">
                    <Row className="flow-root lg:my-6 my-4">
                        <Text className="float-left text-estela-black-full font-medium text-2xl">Items Preview</Text>
                        <Button
                            disabled
                            className="float-right py-1 px-3 text-estela-blue-full border-none text-base font-medium hover:text-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                        >
                            See all
                        </Button>
                    </Row>
                    <Content className="grid gap-2 grid-cols-1 lg:grid-cols-5 items-start w-full"></Content>
                </Content>
            </>
        );
    };

    render(): JSX.Element {
        const {
            loaded,
            args,
            envVars,
            tags,
            newTagName,
            date,
            status,
            lifespan,
            totalResponseBytes,
            created,
            cronjob,
            stats,
            dataStatus,
            dataExpiryDays,
            loading_status,
            modified,
            modalStop,
            modalClone,
            spiders,
            loadedSpiders,
            newTags,
        } = this.state;
        return (
            <Layout className="general-container">
                <Header />
                <Layout className="white-background">
                    <ProjectSidenav projectId={this.projectId} path={"/jobs"} />
                    <Content className="content-padding">
                        {loaded && loadedSpiders ? (
                            <Layout className="white-background">
                                <Content className="bg-metal rounded-2xl">
                                    <Row className="flow-root lg:mt-10 lg:mx-10 mt-6 mx-6">
                                        <Col className="float-left">
                                            <Text className="text-estela-black-medium font-medium text-xl">
                                                Job-{this.jobId}
                                            </Text>
                                        </Col>
                                        <Col className="float-right flex gap-1">
                                            <Button
                                                onClick={() => {
                                                    const newTags: Tags[] = [...this.state.tags].map(
                                                        (tag: TagsData, id: number) => ({
                                                            name: tag.name,
                                                            key: id,
                                                        }),
                                                    );
                                                    this.setState({ modalClone: true, newTags: [...newTags] });
                                                }}
                                                icon={<Copy className="h-6 w-6 mr-2 text-sm" />}
                                                size="large"
                                                className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                            >
                                                Clone this job
                                            </Button>
                                            {status != SpiderJobUpdateStatusEnum.Running ? (
                                                <Button
                                                    icon={<Pause className="h-6 w-6 mr-2 text-sm" />}
                                                    onClick={() => {
                                                        this.setState({ modalStop: true });
                                                    }}
                                                    size="large"
                                                    className="flex items-center stroke-estela-red-full border-estela-red-full hover:stroke-estela-red-full bg-estela-white text-estela-red-full hover:text-estela-red-full text-sm hover:border-estela-red-full rounded-md"
                                                >
                                                    Stop this job
                                                </Button>
                                            ) : (
                                                <Button
                                                    icon={<Run className="h-6 w-6 mr-2 text-sm" />}
                                                    size="large"
                                                    className="flex items-center stroke-white border-estela-red-full hover:stroke-estela-red-full bg-estela-red-full text-white hover:text-estela-red-full text-sm hover:border-estela-red-full rounded-md"
                                                >
                                                    Run this job
                                                </Button>
                                            )}
                                            {modalStop && (
                                                <Modal
                                                    style={{
                                                        overflow: "hidden",
                                                        padding: 0,
                                                    }}
                                                    centered
                                                    width={681}
                                                    visible={modalStop}
                                                    title={
                                                        <p className="text-xl text-center mt-2 font-normal">
                                                            CONFIRM ACTION
                                                        </p>
                                                    }
                                                    onCancel={() => this.setState({ modalStop: false })}
                                                    footer={null}
                                                >
                                                    <Row className="grid sm:grid-cols-1" justify="center">
                                                        <Col className="text-center text-estela-black-full">
                                                            Are you sure you want to stop this job?
                                                        </Col>
                                                    </Row>
                                                    <Row justify="center" className="mt-4">
                                                        <Button
                                                            size="large"
                                                            className="w-48 h-12 mr-1 bg-estela-blue-full text-white hover:text-estela-blue-full hover:border-estela-blue-full rounded-lg"
                                                        >
                                                            Confirm
                                                        </Button>
                                                        <Button
                                                            size="large"
                                                            className="w-48 h-12 ml-1 bg-white text-estela-blue-full border-estela-blue-full hover:text-estela-blue-full hover:border-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                                                            onClick={() => this.setState({ modalStop: false })}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </Row>
                                                </Modal>
                                            )}
                                            {modalClone && (
                                                <Modal
                                                    style={{
                                                        overflow: "hidden",
                                                        padding: 0,
                                                    }}
                                                    centered
                                                    width={681}
                                                    visible={modalClone}
                                                    title={
                                                        <p className="text-xl text-center mt-2 font-normal">NEW JOB</p>
                                                    }
                                                    onCancel={() => this.setState({ modalClone: false })}
                                                    footer={null}
                                                >
                                                    <Row className="grid sm:grid-cols-1">
                                                        <Col className="mx-4">
                                                            <Content>
                                                                <p className="my-2 text-base">Spider</p>
                                                                <Select
                                                                    style={{ borderRadius: 16 }}
                                                                    size="large"
                                                                    className="w-full"
                                                                    defaultValue={spiders[0] ? spiders[0].name : ""}
                                                                >
                                                                    {spiders.map((spider: Spider) => (
                                                                        <Option
                                                                            onClick={() => {
                                                                                this.setState({
                                                                                    newSpiderId: String(spider.sid),
                                                                                });
                                                                            }}
                                                                            key={spider.sid}
                                                                            value={spider.name}
                                                                        >
                                                                            {spider.name}
                                                                        </Option>
                                                                    ))}
                                                                </Select>
                                                            </Content>
                                                            <Content>
                                                                <p className="text-base my-2">Data persistence</p>
                                                                <Select
                                                                    onChange={this.handlePersistenceChange}
                                                                    className="w-full"
                                                                    size="large"
                                                                    defaultValue={this.dataPersistenceOptions[0].value}
                                                                >
                                                                    {this.dataPersistenceOptions.map(
                                                                        (option: OptionDataPersistence) => (
                                                                            <Option
                                                                                className="text-sm"
                                                                                key={option.key}
                                                                                value={option.value}
                                                                            >
                                                                                {option.label}
                                                                            </Option>
                                                                        ),
                                                                    )}
                                                                </Select>
                                                            </Content>
                                                            <Content>
                                                                <p className="text-base my-2">Tags</p>
                                                                <Space direction="horizontal">
                                                                    {newTags.map((tag: Tags, id: number) => {
                                                                        return (
                                                                            <Tag
                                                                                className="text-estela-blue-full border-0 bg-estela-blue-low"
                                                                                closable
                                                                                key={tag.key}
                                                                                onClose={() => this.handleRemoveTag(id)}
                                                                            >
                                                                                {tag.name}
                                                                            </Tag>
                                                                        );
                                                                    })}
                                                                </Space>
                                                                <Space direction="horizontal">
                                                                    <Input
                                                                        size="large"
                                                                        className="border-estela-blue-full rounded-lg"
                                                                        name="newTagName"
                                                                        placeholder="name"
                                                                        value={newTagName}
                                                                        onChange={this.handleInputChange}
                                                                    />
                                                                    <Button
                                                                        shape="circle"
                                                                        size="small"
                                                                        icon={<Add className="p-1" />}
                                                                        className="flex items-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                                                        onClick={this.addTag}
                                                                    ></Button>
                                                                </Space>
                                                            </Content>
                                                            {/* <Content>
                                                                <p className="text-base my-2">Arguments</p>
                                                                <Space direction="vertical">
                                                                    {args.map((arg: ArgsData, id) => (
                                                                        <Tag
                                                                            className="text-estela-blue-full border-0 bg-estela-blue-low"
                                                                            closable
                                                                            key={arg.key}
                                                                            onClose={() => this.handleRemoveArg(id)}
                                                                        >
                                                                            {arg.name}: {arg.value}
                                                                        </Tag>
                                                                    ))}
                                                                    <Space direction="horizontal">
                                                                        <Input
                                                                            size="large"
                                                                            className="border-estela-blue-full rounded-l-lg"
                                                                            name="newArgName"
                                                                            placeholder="name"
                                                                            value={newArgName}
                                                                            onChange={this.handleInputChange}
                                                                        />
                                                                        <Input
                                                                            size="large"
                                                                            className="border-estela-blue-full rounded-r-lg"
                                                                            name="newArgValue"
                                                                            placeholder="value"
                                                                            value={newArgValue}
                                                                            onChange={this.handleInputChange}
                                                                        />
                                                                        <Button
                                                                            shape="circle"
                                                                            size="small"
                                                                            icon={<Add className="p-1" />}
                                                                            className="flex items-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                                                            onClick={this.addArgument}
                                                                        ></Button>
                                                                    </Space>
                                                                </Space>
                                                            </Content> */}
                                                            {/*
                                                            <Content>
                                                                <p className="text-base my-2">Environment Variables</p>
                                                                <Space className="mb-2" direction="horizontal">
                                                                    {envVars.map((envVar: EnvVarsData, id: number) => (
                                                                        <Tag
                                                                            className="text-estela-blue-full border-0 bg-estela-blue-low"
                                                                            closable
                                                                            key={envVar.key}
                                                                            onClose={() => this.handleRemoveEnvVar(id)}
                                                                        >
                                                                            {envVar.name}: {envVar.value}
                                                                        </Tag>
                                                                    ))}
                                                                </Space>
                                                                <Space direction="horizontal">
                                                                    <Input
                                                                        size="large"
                                                                        className="border-estela-blue-full rounded-l-lg"
                                                                        name="newEnvVarName"
                                                                        placeholder="name"
                                                                        value={newEnvVarName}
                                                                        onChange={this.handleInputChange}
                                                                    />
                                                                    <Input
                                                                        size="large"
                                                                        className="border-estela-blue-full rounded-r-lg"
                                                                        name="newEnvVarValue"
                                                                        placeholder="value"
                                                                        value={newEnvVarValue}
                                                                        onChange={this.handleInputChange}
                                                                    />
                                                                    <Button
                                                                        shape="circle"
                                                                        size="small"
                                                                        icon={<Add className="p-1" />}
                                                                        className="flex items-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                                                        onClick={this.addEnvVar}
                                                                    ></Button>
                                                                </Space>
                                                            </Content> */}
                                                        </Col>
                                                    </Row>
                                                    <Row justify="center" className="mt-4">
                                                        <Button
                                                            size="large"
                                                            className="w-48 h-12 mr-1 bg-estela-blue-full text-white hover:text-estela-blue-full hover:border-estela-blue-full rounded-lg"
                                                        >
                                                            Confirm
                                                        </Button>
                                                        <Button
                                                            size="large"
                                                            className="w-48 h-12 ml-1 bg-white text-estela-blue-full border-estela-blue-full hover:text-estela-blue-full hover:border-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                                                            onClick={() => this.setState({ modalClone: false })}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </Row>
                                                </Modal>
                                            )}
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
                                                    children: this.overview(),
                                                },
                                                {
                                                    label: "Items", // (show the quantity of items, to implement)
                                                    key: "2",
                                                },
                                                {
                                                    label: "Requests",
                                                    key: "3",
                                                },
                                                {
                                                    label: "Log",
                                                    key: "4",
                                                },
                                                {
                                                    label: "Stats",
                                                    key: "5",
                                                },
                                            ]}
                                        />
                                    </Row>
                                </Content>
                                <Content>
                                    <Title level={5} className="text-center">
                                        Job {this.jobId}
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
                                                <b>Cronjob:</b>
                                                <Link
                                                    to={`/projects/${this.projectId}/spiders/${this.spiderId}/cronjobs/${cronjob}`}
                                                >
                                                    &nbsp; {cronjob}
                                                </Link>
                                            </Text>
                                            <Text>
                                                <b>Date:</b>&nbsp; {date}
                                            </Text>
                                            <Text>
                                                <b>Status:</b>&nbsp; {status}
                                            </Text>
                                            <Text>
                                                <b>Lifespan:</b>&nbsp; {lifespan}
                                            </Text>
                                            <Text>
                                                <b>Total response bytes:</b>&nbsp; {totalResponseBytes}
                                            </Text>
                                            <Text>
                                                <Space direction="vertical">
                                                    <Space direction="horizontal">
                                                        <Text
                                                            disabled={
                                                                dataStatus == SpiderJobUpdateDataStatusEnum.Deleted
                                                            }
                                                        >
                                                            <b>Data Persistent:</b>&nbsp;
                                                            <Switch
                                                                loading={loading_status}
                                                                defaultChecked={
                                                                    dataStatus ==
                                                                    SpiderJobUpdateDataStatusEnum.Persistent
                                                                }
                                                                onChange={this.onChangeData}
                                                                disabled={
                                                                    dataStatus == SpiderJobUpdateDataStatusEnum.Deleted
                                                                }
                                                            />
                                                        </Text>
                                                    </Space>
                                                    <Space direction="horizontal">
                                                        <Text
                                                            disabled={
                                                                dataStatus ==
                                                                    SpiderJobUpdateDataStatusEnum.Persistent ||
                                                                dataStatus == SpiderJobUpdateDataStatusEnum.Deleted
                                                            }
                                                        >
                                                            <b>Date </b>&nbsp;
                                                            <DatePicker
                                                                format="YYYY-MM-DD"
                                                                onChange={this.onChangeDate}
                                                                disabledDate={this.disabledDate}
                                                                defaultValue={moment(created, "llll").add(
                                                                    dataExpiryDays,
                                                                    "days",
                                                                )}
                                                                disabled={
                                                                    dataStatus ==
                                                                        SpiderJobUpdateDataStatusEnum.Persistent ||
                                                                    dataStatus == SpiderJobUpdateDataStatusEnum.Deleted
                                                                }
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
                                            <Link
                                                to={`/projects/${this.projectId}/spiders/${this.spiderId}/jobs/${this.jobId}/data/${this.dataItems}`}
                                            >
                                                <Button type="primary" className="go-to-job-data">
                                                    Go to spider job items data
                                                </Button>
                                            </Link>
                                            <Link
                                                to={`/projects/${this.projectId}/spiders/${this.spiderId}/jobs/${this.jobId}/data/${this.dataRequests}`}
                                            >
                                                <Button type="primary" className="go-to-job-data">
                                                    Go to spider job request data
                                                </Button>
                                            </Link>
                                            <Link
                                                to={`/projects/${this.projectId}/spiders/${this.spiderId}/jobs/${this.jobId}/data/${this.dataLogs}`}
                                            >
                                                <Button type="primary" className="go-to-job-data">
                                                    Go to spider job logs data
                                                </Button>
                                            </Link>
                                            <Button danger className="stop-job" onClick={this.stopJob}>
                                                <div>Stop Job</div>
                                            </Button>
                                            <Collapse onChange={this.getStats}>
                                                <Panel header="Scrapy Stats" key="1">
                                                    <Text>
                                                        {Object.keys(stats).map((key, idx) => {
                                                            return (
                                                                <div key={idx}>
                                                                    <b>{key.replace(/\\u002e/g, ".")}</b>: {stats[key]}
                                                                </div>
                                                            );
                                                        })}
                                                    </Text>
                                                </Panel>
                                            </Collapse>
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
