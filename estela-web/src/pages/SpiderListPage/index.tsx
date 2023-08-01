import React, { Component, Fragment } from "react";
import { Col, Layout, Row, notification, Select } from "antd";
import { RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { ApiService } from "../../services";
import { SpidersStats, ApiProjectsSpidersListRequest, Spider } from "../../services/api";
import { BytesMetric, parseDurationToSeconds } from "../../utils";
import { Spin, resourceNotAllowedNotification } from "../../shared";
import { HeaderSection, ChartsSection, StatsTableSection } from "../../components";
import type { RangePickerProps } from "antd/es/date-picker";
import moment from "moment";

const { Content } = Layout;
const { Option } = Select;

interface SpiderList {
    key: number;
    name: string;
    sid: number | undefined;
}

interface SpiderListPageState {
    spiders: SpiderList[];
    spiderId: number | undefined;
    spiderStats: SpidersStats[];
    formattedNetwork: BytesMetric;
    formattedStorage: BytesMetric;
    processingTime: number;
    loaded: boolean;
    loadedStats: boolean;
    statsStartDate: moment.Moment;
    statsEndDate: moment.Moment;
}

interface RouteParams {
    projectId: string;
    spiderId: string;
}

export class SpiderListPage extends Component<RouteComponentProps<RouteParams>, SpiderListPageState> {
    PAGE_SIZE = 20;
    state: SpiderListPageState = {
        spiders: [],
        spiderStats: [],
        spiderId: undefined,
        formattedNetwork: {
            quantity: 0,
            type: "",
        },
        formattedStorage: {
            quantity: 0,
            type: "",
        },
        processingTime: 0,
        loaded: false,
        loadedStats: false,
        statsStartDate: moment().subtract(7, "days").startOf("day"),
        statsEndDate: moment(),
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;

    async componentDidMount(): Promise<void> {
        this.getProjectSpiders(1);
    }

    getProjectSpiders = async (page: number): Promise<void> => {
        const requestParams: ApiProjectsSpidersListRequest = { pid: this.projectId, page, pageSize: this.PAGE_SIZE };
        this.apiService.apiProjectsSpidersList(requestParams).then(
            (response) => {
                const spiders: SpiderList[] = response.results.map((spider: Spider, index: number) => {
                    return {
                        key: index,
                        name: spider.name,
                        sid: spider.sid,
                    };
                });
                this.getSpiderStatsAndUpdateDates(null, null, spiders[0].sid);
                this.setState({ spiders: [...spiders], loaded: true, spiderId: spiders[0].sid });
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    };

    getSpiderStatsAndUpdateDates = async (
        startDate?: string | undefined | null,
        endDate?: string | undefined | null,
        sid?: number | undefined,
    ): Promise<void> => {
        this.setState({ loadedStats: false });
        const { statsStartDate, statsEndDate } = this.state;
        if (startDate && endDate) {
            this.setState({
                statsStartDate: moment.utc(startDate),
                statsEndDate: moment.utc(endDate),
            });
        }
        await this.apiService
            .apiStatsSpiderList({
                pid: this.projectId,
                sid: String(sid),
                startDate: !startDate ? statsStartDate.toISOString() : startDate,
                endDate: !endDate ? statsEndDate.toISOString() : endDate,
                offset: new Date().getTimezoneOffset(),
            })
            .then(
                (response: SpidersStats[]) => {
                    response.forEach((stat) => {
                        if (stat.stats.runtime)
                            stat.stats.runtime = parseDurationToSeconds(stat.stats.runtime.toString());
                    });
                    this.setState({
                        spiderStats: [...response],
                        loadedStats: true,
                    });
                },
                (error: Error) => {
                    notification.error({
                        message: "No data",
                        description: error.message,
                    });
                    this.setState({ loadedStats: true });
                },
            );
    };

    onChangeDateRangeHandler: RangePickerProps["onChange"] = (_, dateStrings) => {
        this.setState({ loadedStats: false });
        const [startDateUTC, endDateUTC] = [
            moment(dateStrings[0]).startOf("day").utc().toISOString(),
            moment(dateStrings[1]).endOf("day").utc().toISOString(),
        ];
        this.getSpiderStatsAndUpdateDates(startDateUTC, endDateUTC, this.state.spiderId);
    };

    onRefreshEventHandler = async () => {
        await this.getSpiderStatsAndUpdateDates();
    };

    handleSpiderChange = (value: string | undefined) => {
        console.log(value);
        this.getSpiderStatsAndUpdateDates(null, null, Number(value));
    };

    render(): JSX.Element {
        const {
            loaded,
            spiders,
            formattedNetwork,
            formattedStorage,
            processingTime,
            spiderStats,
            loadedStats,
            statsStartDate,
            statsEndDate,
        } = this.state;
        return (
            <Layout className="bg-metal rounded-2xl">
                {loaded ? (
                    <Fragment>
                        <Row className="lg:m-8 m-4 justify-between">
                            <Col className="">
                                <p className="text-xl font-medium text-silver float-left">SPIDERS</p>
                            </Col>
                            <Col className="flex items-center order-last">
                                <p className="text-base text-estela-black-medium mr-2">Spider:</p>
                                <Select className="w-40"
                                    size="large"
                                    defaultValue={spiders[0].name}
                                    onChange={this.handleSpiderChange}
                                >
                                    {spiders.map((spider: SpiderList) => (
                                        <Option key={spider.sid} value={spider.sid}>{spider.name}</Option>
                                    ))}
                                </Select>
                            </Col>
                        </Row>
                        <Row className="bg-metal-m-4">
                            <Content className="bg-white rounded-2xl py-5 pr-8 pl-5 w-full">
                                <HeaderSection
                                    onRefreshEventHandler={this.onRefreshEventHandler}
                                    onChangeDateRangeHandler={this.onChangeDateRangeHandler}
                                    formattedNetwork={formattedNetwork}
                                    formattedStorage={formattedStorage}
                                    processingTime={processingTime}
                                    stats={spiderStats}
                                    loadedStats={loadedStats}
                                    startDate={statsStartDate.local().format("ddd, DD MMM")}
                                    endDate={statsEndDate.local().format("ddd, DD MMM")}
                                />
                                <ChartsSection stats={spiderStats.slice().reverse()} loadedStats={loadedStats} />
                                <StatsTableSection
                                    pid={this.projectId}
                                    apiService={this.apiService}
                                    stats={spiderStats}
                                    loadedStats={loadedStats}
                                />
                            </Content>
                        </Row>
                    </Fragment>
                ) : (
                    <Spin />
                )}
            </Layout>
        );
    }
}
