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
    Dropdown,
    Tooltip as AntdTooltip,
} from "antd";
import type { RangePickerProps } from "antd/es/date-picker";
import { Link, RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import JobCreateModal from "../JobCreateModal";
import { ApiService } from "../../services";
import { parseDuration, durationToString, formatBytes, getFilteredEnvVars } from "../../utils";
import Copy from "../../assets/icons/copy.svg";
import Pause from "../../assets/icons/pause.svg";
import Export from "../../assets/icons/export.svg";

import {
    ApiProjectsSpidersJobsReadRequest,
    SpiderJobUpdateStatusEnum,
    ApiProjectsSpidersJobsUpdateRequest,
    ApiProjectsSpidersJobsDataListRequest,
    ApiProjectsSpidersListRequest,
    SpiderJob,
    SpiderJobEnvVar,
    SpiderJobUpdate,
    SpiderJobUpdateDataStatusEnum,
    Spider,
} from "../../services/api";
import { JobItemsData, JobRequestsData, JobLogsData, JobStatsData, menu as downloadMenu } from "../JobDataPage";
import { resourceNotAllowedNotification, incorrectDataNotification, Spin } from "../../shared";
import { JobMetrics } from "../../components";
import { convertDateToString } from "../../utils";
import { DEFAULT_RESOURCE_TIER, PREDEFINED_TIERS } from "../../constants";
import { TourStore } from "../../tour";

const { Content } = Layout;
const { Text } = Typography;

interface Dictionary {
    [Key: string]: string;
}

interface ArgsData {
    name: string;
    value: string;
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
    envVars: SpiderJobEnvVar[];
    tags: TagsData[];
    date: string;
    activeKey: string;
    created: string | undefined;
    status: string | undefined;
    cronjob: number | undefined | null;
    items: Dictionary[];
    loadedItems: boolean;
    loadedItemsFirstTime: boolean;
    itemCountInDB: number;
    itemCountInRedis: number;
    itemsCurrent: number;
    dataStatus: string | undefined;
    dataExpiryDays: number | undefined;
    loading_status: boolean;
    modified: boolean;
    modalStop: boolean;
    modalClone: boolean;
    spiders: Spider[];
    loadedSpiders: boolean;
    spiderName: string;
    storageSize?: number;
    databaseInsertionProgress?: number;
    resourceTier?: string;
    peakMemory?: number;
    loadedDownloadButton: boolean;
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
            if (key !== "coverage") {
                this.metadata.push(this.typeDefinition(key, this.item[key]));
            }
        }
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

const bandwidthColor = (bytes: number): string => {
    const gb = bytes / 1e9;
    if (gb > 0.9) return "#E34A46";
    if (gb > 0.75) return "#FFC002";
    return "#7DC932";
};

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
        activeKey: "1",
        created: "",
        status: "",
        cronjob: null,
        items: [],
        loadedItems: false,
        loadedItemsFirstTime: false,
        itemCountInDB: 0,
        itemCountInRedis: 0,
        itemsCurrent: 0,
        dataStatus: "",
        dataExpiryDays: 0,
        loading_status: false,
        modified: false,
        modalStop: false,
        modalClone: false,
        spiders: [],
        loadedSpiders: false,
        spiderName: "",
        storageSize: undefined,
        databaseInsertionProgress: undefined,
        peakMemory: undefined,
        loadedDownloadButton: false,
    };

    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    spiderId: string = this.props.match.params.spiderId;
    jobId: number = parseInt(this.props.match.params.jobId);
    newJobId: string = this.props.match.params.jobId;
    countKey = 0;

    async componentDidMount(): Promise<void> {
        TourStore.setRoute("job-detail");
        TourStore.init();
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
                const lifespan = parseDuration(response.lifespan);
                this.setState({
                    name: response.name,
                    lifespan: lifespan || 0,
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
                    storageSize: response.storageSize,
                    itemCountInRedis: response.itemCount,
                    databaseInsertionProgress: response.databaseInsertionProgress
                        ? parseFloat(response.databaseInsertionProgress)
                        : undefined,
                    resourceTier: response.resourceTier || DEFAULT_RESOURCE_TIER,
                    peakMemory: response.peakMemory,
                });
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
        await this.getItems(1);
        this.setState({ loadedItemsFirstTime: true });
        setTimeout(() => {
            this.getProjectSpiders();
        }, 500);
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
                        loadedSpiders: true,
                    });
                }
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    };

    getData = async (): Promise<void> => {
        const requestParams: ApiProjectsSpidersList = {
            pid: this.projectId,
            sid: this.spiderId,
        };
        this.apiService.apiProjectsSpidersJobsDataList(requestParams).then(
            (results) => {
                if (results.results.length == 0 || results.results == undefined) {
                    this.setState({ items: [], loadedItems: true });
                } else {
                    const data: Dictionary[] = results.results as Dictionary[];
                    this.setState({
                        items: data,
                        loadedItems: true,
                        itemCountInDB: results.count,
                    });
                }
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
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
                error;
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
                error;
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
            },
            (error: unknown) => {
                error;
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

    getItems = async (page: number, pageSize?: number): Promise<void> => {
        const requestParams: ApiProjectsSpidersJobsDataListRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            jid: String(this.jobId),
            type: "items",
            page: page,
            pageSize: pageSize ?? this.PAGE_SIZE,
        };
        this.apiService.apiProjectsSpidersJobsDataList(requestParams).then(
            (response) => {
                let data: Dictionary[] = [];
                if (response.results?.length) {
                    const safe_data: unknown[] = response.results ?? [];
                    data = safe_data as Dictionary[];
                    this.setState({
                        items: data,
                        loadedItems: true,
                        itemsCurrent: page,
                        itemCountInDB: response.count,
                    });
                }
                this.setState({ loadedItems: true, loadedItemsFirstTime: true });
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    };

    overview = (): React.ReactNode => {
        const {
            cronjob,
            tags,
            lifespan,
            loadedItems,
            loadedItemsFirstTime,
            envVars,
            args,
            date,
            dataStatus,
            dataExpiryDays,
            spiderName,
            totalResponseBytes,
            items,
            itemCountInRedis,
            status,
            storageSize,
            databaseInsertionProgress,
            resourceTier,
            peakMemory,
            loadedDownloadButton,
        } = this.state;
        const getProxyTag = (): string => {
            const desiredItem = envVars.find((item) => item.name === "ESTELA_PROXY_NAME");
            return desiredItem ? desiredItem.value : "";
        };
        const bandwidthFormatted = formatBytes(Number(totalResponseBytes) || 0);
        const bandwidthColorVal = bandwidthColor(Number(totalResponseBytes) || 0);

        const lifespanPercentage: number = Math.round(100 * (Math.log((lifespan || 1) as number) / Math.log(3600)));

        const tier = PREDEFINED_TIERS.find((t) => t.name === (resourceTier || DEFAULT_RESOURCE_TIER));
        let tierMemLimitBytes = 1536 * 1024 * 1024;
        if (tier) {
            const limitStr = tier.memLimit;
            if (limitStr.endsWith("Gi")) {
                tierMemLimitBytes = parseFloat(limitStr) * 1024 * 1024 * 1024;
            } else {
                tierMemLimitBytes = parseFloat(limitStr) * 1024 * 1024;
            }
        }
        const tierMemLimitFormatted = formatBytes(tierMemLimitBytes);
        const peakMemoryVal = peakMemory ?? 0;
        const peakMemoryFraction = tierMemLimitBytes > 0 ? peakMemoryVal / tierMemLimitBytes : 0;
        const peakMemoryPercent = Math.min(Math.round(peakMemoryFraction * 100), 100);

        const canDownload = itemCountInRedis > 0 && status === "COMPLETED";

        return (
            <>
                <Content
                    className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 lg:w-full"
                    data-tour-target="job-stats"
                >
                    {/* Bandwidth stat card */}
                    <Card style={{ borderRadius: "8px" }} bordered={false}>
                        <Text className="py-0 text-estela-black-medium font-medium text-base">Bandwidth</Text>
                        <Row className="grid grid-cols-1 py-1 mt-3">
                            <Col>
                                <Text className="font-bold text-estela-black-full text-base">
                                    {`${bandwidthFormatted.quantity} ${bandwidthFormatted.type}`}
                                </Text>
                            </Col>
                            <Col>
                                <Text className="text-estela-black-medium text-xs">this job</Text>
                            </Col>
                            <Col>
                                <div
                                    className="w-full h-2.5 rounded-full"
                                    style={{ backgroundColor: bandwidthColorVal }}
                                ></div>
                            </Col>
                        </Row>
                    </Card>

                    {/* Storage stat card */}
                    <Card style={{ borderRadius: "8px" }} bordered={false}>
                        <Text className="py-0 text-estela-black-medium font-medium text-base">Storage</Text>
                        <Row className="grid grid-cols-1 py-1 mt-3">
                            <Col>
                                <Text className="font-bold text-estela-black-full text-base">
                                    {`${formatBytes(storageSize).quantity} ${formatBytes(storageSize).type}`}
                                </Text>
                            </Col>
                            <Col>
                                <Text className="text-estela-black-medium text-xs">of project</Text>
                            </Col>
                            <Col>
                                <Content className="w-full bg-estela-white-low rounded-full h-2.5">
                                    <div
                                        className="bg-estela-states-green-medium h-2.5 rounded-full"
                                        style={{ width: "100%" }}
                                    ></div>
                                </Content>
                            </Col>
                        </Row>
                    </Card>

                    {/* Item Count stat card */}
                    <Card style={{ borderRadius: "8px" }} bordered={false}>
                        <Text className="py-2 m-0 text-estela-black-medium font-medium text-base">Item Count</Text>
                        <Row className="grid grid-cols-1 py-1 px-2 mt-3">
                            <Col>
                                <Text className="font-bold text-estela-black-full text-lg">
                                    {itemCountInRedis || 0}
                                </Text>
                            </Col>
                            <Col>
                                <Text className="text-estela-black-medium text-xs">this job</Text>
                            </Col>
                            <Col>
                                <Content className="w-full bg-estela-white-low rounded-full h-2.5">
                                    <div
                                        className="bg-estela-states-green-medium h-2.5 rounded-full"
                                        style={{ width: `${lifespanPercentage > 98 ? 100 : lifespanPercentage}%` }}
                                    ></div>
                                </Content>
                            </Col>
                        </Row>
                    </Card>

                    {/* Proc. Time stat card */}
                    <Card style={{ borderRadius: "8px" }} bordered={false}>
                        <Text className="py-2 m-0 text-estela-black-medium font-medium text-base">Proc. Time</Text>
                        <Row className="grid grid-cols-1 py-1 px-2 mt-3">
                            <Col>
                                <Text className="font-bold text-estela-black-full text-lg">
                                    {durationToString(lifespan || 0)}
                                </Text>
                            </Col>
                            <Col>
                                <Text className="text-estela-black-medium text-xs">this job</Text>
                            </Col>
                            <Col>
                                <Content className="w-full bg-estela-white-low rounded-full h-2.5">
                                    <div
                                        className="bg-estela-states-green-medium h-2.5 rounded-full"
                                        style={{ width: `${lifespanPercentage > 98 ? 100 : lifespanPercentage}%` }}
                                    ></div>
                                </Content>
                            </Col>
                        </Row>
                    </Card>

                    {/* Peak Memory stat card */}
                    <Card style={{ borderRadius: "8px", position: "relative" }} bordered={false}>
                        <Tag className="absolute top-2.5 right-2.5 text-estela-blue-full border-estela-blue-full rounded text-xs font-semibold px-2 py-0">
                            {(resourceTier || DEFAULT_RESOURCE_TIER).toUpperCase()}
                        </Tag>
                        <Text className="py-2 text-estela-black-medium font-medium text-base">Peak Memory</Text>
                        <Row className="grid grid-cols-1 py-1 mt-3">
                            <Col>
                                <Text className="font-bold text-estela-black-full text-lg">
                                    {peakMemoryVal > 0
                                        ? `${formatBytes(peakMemoryVal).quantity} ${formatBytes(peakMemoryVal).type}`
                                        : "--"}
                                </Text>
                            </Col>
                            <Col>
                                <Text className="text-estela-black-medium text-xs">
                                    of {tierMemLimitFormatted.quantity} {tierMemLimitFormatted.type} tier limit
                                </Text>
                            </Col>
                            <Col>
                                <Content className="w-full bg-estela-white-low rounded-full h-2.5">
                                    <div
                                        className="h-2.5 rounded-full"
                                        style={{
                                            width: `${peakMemoryPercent}%`,
                                            backgroundColor:
                                                peakMemoryFraction > 0.95
                                                    ? "#E34A46"
                                                    : peakMemoryFraction > 0.85
                                                    ? "#EAB308"
                                                    : "#1D4ED8",
                                        }}
                                    ></div>
                                </Content>
                            </Col>
                        </Row>
                    </Card>
                </Content>
                <Content className="my-2 grid sm:grid-cols-1 md:grid-cols-12 lg:grid-cols-12 grid-cols-12 gap-2 items-start lg:w-full">
                    <Card
                        className="w-full sm:col-span-1 md:col-span-5 col-span-5 flex flex-col"
                        style={{ borderRadius: "8px" }}
                        bordered={false}
                    >
                        <Text className="py-2 text-estela-black-medium font-medium text-base">DETAILS</Text>
                        <Row className="grid grid-cols-3 py-1 px-2">
                            <Col>
                                <Text className="font-bold">Spider</Text>
                            </Col>
                            <Col className="col-span-2">
                                <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}`}>
                                    <Text ellipsis={true} className="text-estela-blue-medium px-2">
                                        {spiderName}
                                    </Text>
                                </Link>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-2 rounded-lg">
                            <Col className="col-span-1">
                                <Text className="font-bold">Project ID</Text>
                            </Col>
                            <Col className="col-span-2">
                                <Link
                                    to={`/projects/${this.projectId}/dashboard`}
                                    className="text-estela-blue-medium px-2"
                                >
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
                            <Col className="col-span-1">
                                <Text className="font-bold">Scheduled job</Text>
                            </Col>
                            <Col className="col-span-2 px-2">
                                {cronjob ? (
                                    <Link
                                        to={`/projects/${this.projectId}/spiders/${this.spiderId}/cronjobs/${cronjob}`}
                                        className="text-estela-blue-medium"
                                    >
                                        Sche-Job-{cronjob}
                                    </Link>
                                ) : (
                                    <Text className="text-estela-black-medium text-xs">Not associated</Text>
                                )}
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 py-1 px-2">
                            <Col className="col-span-1">
                                <Text className="font-bold">Resource Tier</Text>
                            </Col>
                            <Col className="col-span-2 px-2">
                                <Tag color="blue">{resourceTier || DEFAULT_RESOURCE_TIER}</Tag>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-2 rounded-lg">
                            <Col>
                                <Text className="font-bold">Tags</Text>
                            </Col>
                            <Col className="col-span-2 px-2">
                                <Space direction="horizontal" className="flex flex-wrap">
                                    {tags.map((tag: TagsData, id) => (
                                        <Tag
                                            className="border-estela-blue-full bg-estela-blue-low text-estela-blue-full rounded-md"
                                            key={id}
                                        >
                                            {tag.name}
                                        </Tag>
                                    ))}
                                    {tags.length == 0 && (
                                        <Text className="text-estela-black-medium text-xs">No tags</Text>
                                    )}
                                </Space>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-2 rounded-lg">
                            <Col>
                                <Text className="font-bold">Environment variables</Text>
                            </Col>
                            <Col className="px-2">
                                <Space direction="vertical" className="flex flex-wrap">
                                    {getFilteredEnvVars(envVars).map((envVar: SpiderJobEnvVar, id) =>
                                        envVar.masked ? (
                                            <AntdTooltip
                                                title="Masked variable"
                                                showArrow={false}
                                                overlayClassName="tooltip"
                                                key={id}
                                            >
                                                <Tag className="environment-variables" key={id}>
                                                    {envVar.name}
                                                </Tag>
                                            </AntdTooltip>
                                        ) : (
                                            <Tag className="environment-variables" key={id}>
                                                {envVar.name}: {envVar.value}
                                            </Tag>
                                        ),
                                    )}
                                    {envVars.length == 0 && (
                                        <Text className="text-estela-black-medium text-xs">
                                            No environment variables
                                        </Text>
                                    )}
                                </Space>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 py-1 px-2">
                            <Col>
                                <Text className="font-bold">Proxy</Text>
                            </Col>
                            <Col className="px-2">
                                <Space direction="vertical">
                                    {getProxyTag() === "" ? (
                                        <Text className="text-estela-black-medium text-xs">No Proxy</Text>
                                    ) : (
                                        <Tag className="proxy" key="1">
                                            {getProxyTag()}
                                        </Tag>
                                    )}
                                </Space>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-2 rounded-lg">
                            <Col>
                                <Text className="font-bold">Arguments</Text>
                            </Col>
                            <Col className="col-span-2 px-2">
                                <Space direction="horizontal" className="flex flex-wrap">
                                    {args.map((arg: ArgsData, id) => (
                                        <Tag
                                            className="border-estela-blue-full bg-estela-blue-low text-estela-blue-full rounded-md"
                                            key={id}
                                        >
                                            {arg.name}: {arg.value}
                                        </Tag>
                                    ))}
                                    {args.length == 0 && (
                                        <Text className="text-estela-black-medium text-xs">No arguments</Text>
                                    )}
                                </Space>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 py-1 px-2">
                            <Col>
                                <Text className="font-bold">Job Status</Text>
                            </Col>
                            {status == "IN_QUEUE" && (
                                <Col className="col-span-2 px-2">
                                    <Tag className="bg-estela-yellow-low text-estela-blue-full border-estela-blue-full rounded-md">
                                        {status}
                                    </Tag>
                                </Col>
                            )}
                            {status == "WAITING" && (
                                <Col className="col-span-2 px-2">
                                    <Tag className="bg-estela-yellow-low text-estela-blue-full border-estela-blue-full rounded-md">
                                        {status}
                                    </Tag>
                                </Col>
                            )}
                            {status == "COMPLETED" && (
                                <Col className="col-span-2 px-2">
                                    <Tag className="bg-estela-blue-low text-estela-blue-full border-estela-blue-full rounded-md">
                                        {status}
                                    </Tag>
                                </Col>
                            )}
                            {status == "RUNNING" && (
                                <Col className="col-span-2 px-2">
                                    <Tag className="bg-estela-blue-low text-estela-green-full border-estela-green-full rounded-md">
                                        {status}
                                    </Tag>
                                </Col>
                            )}
                            {status == "ERROR" && (
                                <Col className="col-span-2 px-2">
                                    <Tag className="bg-estela-red-low text-estela-red-full border-estela-red-full rounded-md">
                                        {status}
                                    </Tag>
                                </Col>
                            )}
                            {status == "INCOMPLETE" && (
                                <Col className="col-span-2 px-2">
                                    <Tag className="bg-estela-red-low text-estela-red-full border-estela-red-full rounded-md">
                                        {status}
                                    </Tag>
                                </Col>
                            )}
                            {status == "STOPPED" && (
                                <Col className="col-span-2 px-2">
                                    <Tag className="bg-estela-white-medium text-estela-yellow border-estela-yellow rounded-md">
                                        {status}
                                    </Tag>
                                </Col>
                            )}
                        </Row>
                        {status === "COMPLETED" && (
                            <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-2 rounded-lg">
                                <Col>
                                    <Text className="font-bold">Database Insertion Progress</Text>
                                </Col>
                                <Col className="col-span-2 px-2">
                                    {databaseInsertionProgress !== undefined ? (
                                        <div className="flex items-center">
                                            <div className="w-48 bg-gray-200 rounded-full h-2.5 mr-2">
                                                <div
                                                    className="bg-estela-green-full h-2.5 rounded-full"
                                                    style={{ width: `${databaseInsertionProgress}%` }}
                                                ></div>
                                            </div>
                                            <span>{databaseInsertionProgress.toFixed(1)}%</span>
                                        </div>
                                    ) : (
                                        <Text className="text-estela-black-medium text-xs">No data available</Text>
                                    )}
                                </Col>
                            </Row>
                        )}
                        <Row className="grid grid-cols-3 py-1 px-2">
                            <Col>
                                <Text className="font-bold">Data Persistence</Text>
                            </Col>
                            <Col className="col-span-2 px-2">
                                {dataStatus == "PENDING" ? (
                                    `${dataExpiryDays} days`
                                ) : dataStatus == "PERSISTENT" ? (
                                    "Forever"
                                ) : (
                                    <p className="text-estela-red-full">Job data was automatically deleted</p>
                                )}
                            </Col>
                        </Row>
                    </Card>
                    <Card
                        className="w-full sm:col-span-1 md:col-span-7 col-span-7 flex flex-col"
                        style={{ borderRadius: "8px" }}
                        bordered={false}
                    >
                        <Row className="flow-root lg:my-6 my-4">
                            <Text className="py-2 m-4 text-estela-black-medium font-medium text-base">Fields</Text>
                            <AntdTooltip title={!canDownload ? "No items to download yet" : undefined}>
                                <Dropdown
                                    disabled={!canDownload}
                                    overlay={() =>
                                        downloadMenu(
                                            "items",
                                            this.projectId,
                                            this.spiderId,
                                            String(this.jobId),
                                            (v: boolean) => this.setState({ loadedDownloadButton: v }),
                                        )
                                    }
                                >
                                    <Button
                                        loading={loadedDownloadButton}
                                        size="middle"
                                        icon={<Export className="h-3.5 w-4 mr-2" />}
                                        className="float-right flex items-center mr-2 stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                    >
                                        Download items
                                    </Button>
                                </Dropdown>
                            </AntdTooltip>
                            <Button
                                onClick={() => {
                                    this.setState({ activeKey: "2" });
                                }}
                                className="float-right py-1 px-3 text-estela-blue-full border-none text-base hover:text-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                            >
                                See items
                            </Button>
                        </Row>
                        {loadedItemsFirstTime &&
                            (!items.length ? (
                                <Row className="grid grid-cols-3 py-1 px-4 mt-4">
                                    <Col className="text-center col-span-3">
                                        {loadedItems ? (
                                            <Text className="text-estela-black-medium">No data</Text>
                                        ) : (
                                            <Spin />
                                        )}
                                    </Col>
                                </Row>
                            ) : (
                                <ItemsMetadata item={items[0]} />
                            ))}
                    </Card>
                </Content>
            </>
        );
    };

    render(): JSX.Element {
        const {
            loaded,
            status,
            modalStop,
            modalClone,
            spiders,
            activeKey,
            loadedSpiders,
            itemsCurrent,
            loadedItems,
            loadedItemsFirstTime,
        } = this.state;
        return (
            <Content className="content-padding">
                {loaded ? (
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
                                            this.setState({
                                                modalClone: true,
                                            });
                                        }}
                                        loading={!loadedSpiders}
                                        disabled={!loadedSpiders}
                                        icon={!loadedSpiders ? null : <Copy className="h-6 w-6 mr-2 text-sm" />}
                                        size="large"
                                        className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                    >
                                        {!loadedSpiders ? "Loading..." : "Clone this job"}
                                    </Button>
                                    <Button
                                        disabled={!(status == SpiderJobUpdateStatusEnum.Running)}
                                        icon={<Pause className="h-6 w-6 mr-2 text-sm" />}
                                        onClick={() => {
                                            this.setState({ modalStop: true });
                                        }}
                                        size="large"
                                        className="flex items-center stroke-white border-estela-red-full hover:stroke-estela-red-full bg-estela-red-full text-white hover:text-estela-red-full text-sm hover:border-estela-red-full rounded-md"
                                    >
                                        Stop this job
                                    </Button>
                                    {modalStop && (
                                        <Modal
                                            style={{
                                                overflow: "hidden",
                                                padding: 0,
                                            }}
                                            centered
                                            width={681}
                                            open={modalStop}
                                            title={
                                                <p className="text-xl text-center mt-2 font-normal">CONFIRM ACTION</p>
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
                                        <JobCreateModal
                                            openModal={modalClone}
                                            spider={spiders.find((s) => String(s.sid) === this.spiderId) || null}
                                            projectId={this.projectId}
                                            hideRunButton={true}
                                            initialArgs={this.state.args.map((arg: ArgsData, index) => ({
                                                name: arg.name,
                                                value: arg.value,
                                                key: index,
                                            }))}
                                            initialEnvVars={this.state.envVars}
                                            initialTags={this.state.tags}
                                            onClose={() => this.setState({ modalClone: false })}
                                        />
                                    )}
                                </Col>
                            </Row>
                            <Row className="lg:mx-10 mx-6">
                                <Tabs
                                    size="middle"
                                    onChange={(activeKey: string) => {
                                        this.setState({ activeKey: activeKey });
                                        if (activeKey === "2" && !loadedItems && !loadedItemsFirstTime) {
                                            this.getItems(itemsCurrent);
                                        }
                                    }}
                                    className="w-full"
                                    activeKey={activeKey}
                                    defaultActiveKey={"1"}
                                    items={[
                                        {
                                            label: "Overview",
                                            key: "1",
                                            children: this.overview(),
                                        },
                                        {
                                            label: "Metrics (Experimental)",
                                            key: "6",
                                            children: (
                                                <JobMetrics
                                                    jobId={String(this.jobId)}
                                                    projectId={this.projectId}
                                                    spiderId={this.spiderId}
                                                    jobStatus={status}
                                                />
                                            ),
                                        },
                                        {
                                            label: "Items",
                                            key: "2",
                                            children: (
                                                <JobItemsData
                                                    projectId={this.projectId}
                                                    spiderId={this.spiderId}
                                                    jobId={String(this.jobId)}
                                                />
                                            ),
                                        },
                                        {
                                            label: "Requests",
                                            key: "3",
                                            children: (
                                                <JobRequestsData
                                                    projectId={this.projectId}
                                                    spiderId={this.spiderId}
                                                    jobId={String(this.jobId)}
                                                />
                                            ),
                                        },
                                        {
                                            label: "Log",
                                            key: "4",
                                            children: (
                                                <JobLogsData
                                                    projectId={this.projectId}
                                                    spiderId={this.spiderId}
                                                    jobId={String(this.jobId)}
                                                />
                                            ),
                                        },
                                        {
                                            label: "Stats",
                                            key: "5",
                                            children: (
                                                <JobStatsData
                                                    projectId={this.projectId}
                                                    spiderId={this.spiderId}
                                                    jobId={String(this.jobId)}
                                                />
                                            ),
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
        );
    }
}
