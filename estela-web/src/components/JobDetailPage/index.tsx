import React, { Component } from "react";
import moment from "moment";
import {
    Layout,
    Typography,
    Row,
    Col,
    Space,
    Tag,
    Button,
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
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import Copy from "../../assets/icons/copy.svg";
import Run from "../../assets/icons/play.svg";
import Pause from "../../assets/icons/pause.svg";
import Add from "../../assets/icons/add.svg";

import {
    ApiProjectsSpidersJobsReadRequest,
    SpiderJobUpdateStatusEnum,
    ApiProjectsSpidersJobsCreateRequest,
    ApiProjectsSpidersJobsUpdateRequest,
    ApiProjectsSpidersJobsDataListRequest,
    ApiProjectsSpidersListRequest,
    SpiderJob,
    SpiderJobCreate,
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
const { Text } = Typography;
const { Option } = Select;

interface Dictionary {
    [Key: string]: string;
}

interface OptionDataPersistence {
    label: string;
    key: number;
    value: number;
}

interface ArgsData {
    name: string;
    value: string;
}

interface Args {
    name: string;
    value: string;
    key: number;
}

interface EnvVarsData {
    name: string;
    value: string;
}

interface EnvVars {
    name: string;
    value: string;
    key: number;
}

interface TagsData {
    name: string;
}

interface Tags {
    name: string;
    key: number;
}

interface JobDetailPageState {
    loaded: boolean;
    name: string | undefined;
    lifespan: number | undefined;
    totalResponseBytes: number | undefined;
    requestCount: number | undefined;
    args: ArgsData[];
    envVars: EnvVarsData[];
    tags: TagsData[];
    date: string;
    created: string | undefined;
    status: string | undefined;
    cronjob: number | undefined | null;
    stats: Dictionary;
    loadedStats: boolean;
    items: Dictionary[];
    loadedItems: boolean;
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
    newArgs: Args[];
    newArgName: string;
    newArgValue: string;
    newEnvVars: EnvVars[];
    newEnvVarName: string;
    newEnvVarValue: string;
}

interface RouteParams {
    projectId: string;
    spiderId: string;
    jobId: string;
}

type ItemsMetadataProps = {
    item: Dictionary;
};

interface MetadataField {
    field: string;
    type: string;
}

interface StorageMetric {
    quantity: number;
    type: string;
}

class ItemsMetadata extends Component<ItemsMetadataProps> {
    item = this.props.item;
    metadata: MetadataField[] = [];

    isValidHttpUrl = (str: string): boolean => {
        let url;
        try {
            url = new URL(str);
        } catch (_) {
            return false;
        }
        return url.protocol === "http:" || url.protocol === "https:";
    };

    typeDefinition = (field: string, value: string): MetadataField => {
        const meta: MetadataField = {
            field: field,
            type: "text",
        };
        if (this.isValidHttpUrl(value)) {
            meta.type = "url";
        }
        return meta;
    };

    parseMetadata = (): void => {
        this.metadata.splice(0, this.metadata.length);
        for (const key in this.item) {
            this.metadata.push(this.typeDefinition(key, this.item[key]));
        }
        console.log(this.metadata);
    };

    render(): React.ReactNode {
        this.parseMetadata();
        return (
            <>
                {this.metadata.map((item: MetadataField, index: number) => {
                    if (index & 1) {
                        return (
                            <Row
                                key={`metadata-${index}`}
                                className="grid grid-cols-3 bg-estela-blue-low py-1 px-4 rounded-lg"
                            >
                                <Col className="col-span-1">
                                    <Text className="font-bold">{item.field}</Text>
                                </Col>
                                <Col className="col-span-2">
                                    <Text className="text-estela-black-medium">{item.type}</Text>
                                </Col>
                            </Row>
                        );
                    }
                    return (
                        <Row key={`metadata-${index}`} className="grid grid-cols-3 py-1 px-4 mt-4">
                            <Col className="col-span-1">
                                <Text className="font-bold">{item.field}</Text>
                            </Col>
                            <Col className="col-span-2">
                                <Text className="text-estela-black-medium">{item.type}</Text>
                            </Col>
                        </Row>
                    );
                })}
            </>
        );
    }
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
        requestCount: 0,
        args: [],
        envVars: [],
        tags: [],
        date: "",
        created: "",
        status: "",
        cronjob: null,
        stats: {},
        loadedStats: false,
        items: [],
        loadedItems: false,
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
        newDataStatus: "PENDING",
        newTags: [],
        newTagName: "",
        newArgs: [],
        newArgName: "",
        newArgValue: "",
        newEnvVars: [],
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
                    const lifeSpanArr: string[] = String(response.lifespan ?? 0).split(":");
                    const lifespan: number =
                        lifeSpanArr.length !== 3 ? 0 : +lifeSpanArr[0] * 3600 + +lifeSpanArr[1] * 60 + +lifeSpanArr[2];
                    this.setState({
                        name: response.name,
                        lifespan: lifespan,
                        totalResponseBytes: response.totalResponseBytes,
                        args: [...args],
                        envVars: [...envVars],
                        tags: [...tags],
                        date: convertDateToString(response.created),
                        created: `${response.created}`,
                        status: response.jobStatus,
                        cronjob: response.cronjob,
                        requestCount: response.requestCount,
                        loaded: true,
                        dataStatus: response.dataStatus,
                        dataExpiryDays: response.dataExpiryDays == null ? 1 : response.dataExpiryDays,
                    });
                },
                (error: unknown) => {
                    console.error(error);
                    resourceNotAllowedNotification();
                },
            );
            this.getProjectSpiders();
            this.getItems(1, 1);
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

    getData = async (): Promise<void> => {
        const requestParams: ApiProjectsSpidersJobsDataListRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            jid: `${this.jobId}`,
        };
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

    handleRemoveArg = (id: number): void => {
        const newArgs = [...this.state.newArgs];
        newArgs.splice(id, 1);
        this.setState({ newArgs: [...newArgs] });
    };

    handleRemoveEnvVar = (id: number): void => {
        const newEnvVars = [...this.state.newEnvVars];
        newEnvVars.splice(id, 1);
        this.setState({ newEnvVars: [...newEnvVars] });
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

    handleSubmit = (): void => {
        const futureDate: Date = new Date();
        futureDate.setDate(futureDate.getDate() + this.state.newDataExpireDays);
        const requestData = {
            args: [...this.state.newArgs],
            envVars: [...this.state.newEnvVars],
            tags: [...this.state.newTags],
            dataStatus: this.state.newDataStatus,
            dataExpiryDays: `${futureDate.getUTCFullYear()}-${futureDate.getUTCMonth() + 1}-${futureDate.getUTCDate()}`,
        };
        const request: ApiProjectsSpidersJobsCreateRequest = {
            data: requestData,
            pid: this.projectId,
            sid: this.state.newSpiderId,
        };
        this.apiService.apiProjectsSpidersJobsCreate(request).then(
            (response: SpiderJobCreate) => {
                history.push(`/projects/${this.projectId}/spiders/${this.state.newSpiderId}/jobs/${response.jid}`);
                location.reload();
            },
            (error: unknown) => {
                console.error(error);
                incorrectDataNotification();
            },
        );
    };

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

    addArgument = (): void => {
        const newArgs = [...this.state.newArgs];
        const newArgName = this.state.newArgName.trim();
        const newArgValue = this.state.newArgValue.trim();
        if (newArgName && newArgValue && newArgName.indexOf(" ") == -1) {
            newArgs.push({ name: newArgName, value: newArgValue, key: this.countKey++ });
            this.setState({ newArgs: [...newArgs], newArgName: "", newArgValue: "" });
        } else {
            invalidDataNotification("Invalid argument name/value pair.");
        }
    };

    addEnvVar = (): void => {
        const newEnvVars = [...this.state.newEnvVars];
        const newEnvVarName = this.state.newEnvVarName.trim();
        const newEnvVarValue = this.state.newEnvVarValue.trim();
        if (newEnvVarName && newEnvVarValue && newEnvVarName.indexOf(" ") == -1) {
            newEnvVars.push({ name: newEnvVarName, value: newEnvVarValue, key: this.countKey++ });
            this.setState({ newEnvVars: [...newEnvVars], newEnvVarName: "", newEnvVarValue: "" });
        } else {
            invalidDataNotification("Invalid environment variable name/value pair.");
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

    updateStatus = (_status: SpiderJobUpdateStatusEnum): void => {
        this.setState({ loading_status: true });
        const request: ApiProjectsSpidersJobsUpdateRequest = {
            jid: this.jobId,
            sid: this.spiderId,
            pid: this.projectId,
            data: {
                status: _status,
            },
        };
        this.apiService.apiProjectsSpidersJobsUpdate(request).then(
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
                    this.setState({ stats: data, loadedStats: true });
                }
            },
            (error: unknown) => {
                console.error(error);
                resourceNotAllowedNotification();
            },
        );
    };

    getItems = (page: number, pageSize: number): void => {
        const requestParams: ApiProjectsSpidersJobsDataListRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            jid: this.newJobId,
            type: "items",
            page: page,
            pageSize: pageSize,
        };
        this.apiService.apiProjectsSpidersJobsDataList(requestParams).then(
            (response) => {
                let data: Dictionary[] = [];
                if (response.results?.length) {
                    const safe_data: unknown[] = response.results ?? [];
                    data = safe_data as Dictionary[];
                    console.log(data);
                    this.setState({ items: data, loadedItems: true });
                }
                this.setState({ loadedItems: true });
            },
            (error: unknown) => {
                console.error(error);
                resourceNotAllowedNotification();
            },
        );
    };

    formatBytes = (bytes: number): StorageMetric => {
        if (!+bytes) {
            return {
                quantity: 0,
                type: "Bytes",
            };
        } else {
            const sizes = ["Bytes", "KB", "MB", "GB"];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            const ans: StorageMetric = {
                quantity: 0,
                type: "",
            };
            switch (i) {
                case 0:
                    ans.quantity = parseFloat(bytes.toFixed(2));
                    break;
                case 1:
                    ans.quantity = parseFloat((bytes / 1e3).toFixed(2));
                    break;
                case 2:
                    ans.quantity = parseFloat((bytes / 1e6).toFixed(2));
                    break;
                default:
                    ans.quantity = parseFloat((bytes / 1e9).toFixed(2));
                    break;
            }
            ans["type"] = `${sizes[i > sizes.length - 1 ? 3 : i]}`;
            return ans;
        }
    };

    percentageStorage = (storage: StorageMetric): number => {
        if (storage.type === "Bytes" || storage.type === "KB") {
            return storage.quantity / 1e3;
        } else if (storage.type === "MB") {
            return storage.quantity < 300 ? storage.quantity / 300 : storage.quantity / 1e3;
        }
        return storage.quantity / 10;
    };

    overview = (): React.ReactNode => {
        const {
            tags,
            lifespan,
            loadedItems,
            envVars,
            args,
            date,
            dataStatus,
            spiderName,
            totalResponseBytes,
            requestCount,
            items,
        } = this.state;
        const radius = 100;
        const circunference: number = ((2 * 22) / 7) * radius;
        const storage: StorageMetric = this.formatBytes(dataStatus !== "DELETED" ? totalResponseBytes || 0 : 0);
        const storagePercentage = this.percentageStorage(storage);
        const requestCountDecimalPercentage: number = (requestCount || 0) * 1e-9;
        const requestCountPercentage: number = 100 * requestCountDecimalPercentage;
        const lifespanPercentage: number = 100 * ((lifespan ?? 0) / 120);

        return (
            <>
                <Content className="grid lg:grid-cols-12 grid-cols-12 gap-2 items-start lg:w-full">
                    <Card className="w-full col-span-5 flex flex-col" style={{ borderRadius: "8px" }} bordered={false}>
                        <Text className="py-2 text-estela-black-medium font-medium text-base">Storage</Text>
                        <Content className="grid w-full h-1/2 place-content-center">
                            <Content className="flex items-center justify-center">
                                <svg className="transform -rotate-90 w-72 h-72">
                                    <circle
                                        cx="144"
                                        cy="144"
                                        r={`${radius}`}
                                        stroke="currentColor"
                                        strokeWidth="5"
                                        fill="transparent"
                                        className="text-estela-white-low"
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
                                <Content className="absolute items-center justify-center">
                                    <span className="text-3xl text-center">{`${storage.quantity}${storage.type}`}</span>
                                    <br />
                                    <span className="text-lg text-center mx-5">of 1GB</span>
                                </Content>
                            </Content>
                        </Content>
                    </Card>
                    <Card className="w-full col-span-7 flex flex-col" style={{ borderRadius: "8px" }} bordered={false}>
                        <Text className="py-2 text-estela-black-medium font-medium text-base">DETAILS</Text>
                        <Row className="grid grid-cols-3 py-1 px-2 mt-4">
                            <Col>
                                <Text className="font-bold">Spider ID</Text>
                            </Col>
                            <Col>
                                <Link
                                    to={`/projects/${this.projectId}/spiders/${this.spiderId}`}
                                    className="text-estela-blue-medium px-2"
                                >
                                    {this.spiderId}
                                </Link>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-2 rounded-lg">
                            <Col className="col-span-1">
                                <Text className="font-bold">Project ID</Text>
                            </Col>
                            <Col className="col-span-2">
                                <Link to={`/projects/${this.projectId}`} className="text-estela-blue-medium px-2">
                                    {this.projectId}
                                </Link>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 py-1 px-2">
                            <Col className="col-span-1">
                                <Text className="font-bold">Creation date</Text>
                            </Col>
                            <Col className="col-span-2 px-2">{date}</Col>
                        </Row>
                        <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-2 rounded-lg">
                            <Col>
                                <Text className="font-bold">Tags</Text>
                            </Col>
                            <Col className="px-2">
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
                        <Row className="grid grid-cols-3 py-1 px-2">
                            <Col>
                                <Text className="font-bold">Environment variables</Text>
                            </Col>
                            <Col className="px-2">
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
                        <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-2 rounded-lg">
                            <Col>
                                <Text className="font-bold">Arguments</Text>
                            </Col>
                            <Col className="px-2">
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
                        <Row className="grid grid-cols-3 py-1 px-2">
                            <Col>
                                <Text className="font-bold">Spider</Text>
                            </Col>
                            <Col>
                                <Link
                                    to={`/projects/${this.projectId}/spiders/${this.spiderId}`}
                                    className="text-estela-blue-medium px-2"
                                >
                                    {spiderName}
                                </Link>
                            </Col>
                        </Row>
                    </Card>
                </Content>
                <Content className="my-2 grid lg:grid-cols-12 grid-cols-12 gap-1 items-start lg:w-full">
                    <Card
                        className="opacity-60 cursor-not-allowed w-full col-span-2 flex flex-col"
                        style={{ borderRadius: "8px" }}
                        bordered={false}
                    >
                        <Text className="py-0 text-estela-black-medium font-medium text-base">Bandwidth</Text>
                        <Row className="grid grid-cols-1 py-1 mt-3">
                            <Col>
                                <Text className="font-bold text-estela-black-full text-lg">
                                    {requestCountDecimalPercentage.toFixed(2)}
                                </Text>
                                <Text className="text-estela-black-full text-base">/1GB</Text>
                            </Col>
                            <Col>
                                <Text className="text-estela-black-medium text-xs">of project</Text>
                            </Col>
                            <Col>
                                <Content className="w-full bg-estela-white-low rounded-full h-2.5 dark:bg-estela-white-low">
                                    <div
                                        className="bg-estela-states-green-medium h-2.5 rounded-full"
                                        style={{ width: `${Math.round(requestCountPercentage)}%` }}
                                    ></div>
                                </Content>
                            </Col>
                        </Row>
                    </Card>
                    <Card className="w-full col-span-3 flex flex-col" style={{ borderRadius: "8px" }} bordered={false}>
                        <Text className="py-2 m-2 text-estela-black-medium font-medium text-base">Processing Time</Text>
                        <Row className="grid grid-cols-1 py-1 px-2 mt-3">
                            <Col>
                                <Text className="font-bold text-estela-black-full text-lg">
                                    {(lifespan ?? 0).toFixed(2)}
                                </Text>
                                <Text className="text-estela-black-full text-base"> seg</Text>
                            </Col>
                            <Col>
                                <Text className="text-estela-black-medium text-xs">this job</Text>
                            </Col>
                            <Col>
                                <Content className="w-full bg-estela-white-low rounded-full h-2.5 dark:bg-estela-white-low">
                                    <div
                                        className="bg-estela-states-green-medium h-2.5 rounded-full"
                                        style={{ width: `${Math.round(lifespanPercentage)}%` }}
                                    ></div>
                                </Content>
                            </Col>
                        </Row>
                    </Card>
                    <Card className="w-full col-span-7 flex flex-col" style={{ borderRadius: "8px" }} bordered={false}>
                        <Row className="flow-root lg:my-6 my-4">
                            <Text className="py-2 m-4 text-estela-black-medium font-medium text-base">Fields</Text>
                            <Button
                                disabled
                                className="float-right py-1 px-3 text-estela-blue-full border-none text-base font-medium hover:text-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                            >
                                See items
                            </Button>
                        </Row>
                        {loadedItems ? (
                            !items.length ? (
                                <Row className="grid grid-cols-3 py-1 px-4 mt-4">
                                    <Col className="text-center col-span-3">
                                        <Text className="font-bold text-estela-black-medium col-span-3">No data</Text>
                                    </Col>
                                </Row>
                            ) : (
                                <ItemsMetadata item={items[0]} />
                            )
                        ) : (
                            <Spin />
                        )}
                    </Card>
                </Content>
            </>
        );
    };

    render(): JSX.Element {
        const {
            loaded,
            newTagName,
            status,
            modalStop,
            modalClone,
            spiders,
            loadedSpiders,
            newTags,
            newArgs,
            newArgName,
            newArgValue,
            newEnvVars,
            newEnvVarName,
            newEnvVarValue,
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
                                                    const newArgs: Args[] = [...this.state.args].map(
                                                        (arg: ArgsData, id: number) => ({
                                                            name: arg.name,
                                                            value: arg.value,
                                                            key: id,
                                                        }),
                                                    );
                                                    const newEnvVars: EnvVars[] = [...this.state.envVars].map(
                                                        (tag: EnvVarsData, id: number) => ({
                                                            name: tag.name,
                                                            value: tag.value,
                                                            key: id,
                                                        }),
                                                    );
                                                    this.setState({
                                                        modalClone: true,
                                                        newTags: [...newTags],
                                                        newArgs: [...newArgs],
                                                        newEnvVars: [...newEnvVars],
                                                    });
                                                }}
                                                icon={<Copy className="h-6 w-6 mr-2 text-sm" />}
                                                size="large"
                                                className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                            >
                                                Clone this job
                                            </Button>
                                            {status == SpiderJobUpdateStatusEnum.Running ? (
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
                                                    onClick={() => this.updateStatus(SpiderJobUpdateStatusEnum.Running)}
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
                                                            onClick={() => {
                                                                this.updateStatus(SpiderJobUpdateStatusEnum.Stopped);
                                                                this.setState({ modalStop: false });
                                                            }}
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
                                                            <Content>
                                                                <p className="text-base my-2">Arguments</p>
                                                                <Space direction="vertical">
                                                                    {newArgs.map((arg: Args, id) => (
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
                                                            </Content>
                                                            <Content>
                                                                <p className="text-base my-2">Environment Variables</p>
                                                                <Space className="mb-2" direction="horizontal">
                                                                    {newEnvVars.map((envVar: EnvVars, id: number) => (
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
                                                            </Content>
                                                        </Col>
                                                    </Row>
                                                    <Row justify="center" className="mt-4">
                                                        <Button
                                                            onClick={this.handleSubmit}
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
                                                    label: "Items",
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
