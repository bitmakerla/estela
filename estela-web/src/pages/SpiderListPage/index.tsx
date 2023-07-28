import React, { Component, Fragment } from "react";
import { Col, Layout, Row, notification } from "antd";
import { RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { ApiService } from "../../services";
import { SpidersStats } from "../../services/api";
import { BytesMetric, parseDurationToSeconds } from "../../utils";
import { Spin } from "../../shared";
import { HeaderSection, ChartsSection, StatsTableSection } from "../../components";
import type { RangePickerProps } from "antd/es/date-picker";
import moment from "moment";

const { Content } = Layout;

interface SpiderList {
    key: number;
    name: string;
    sid: number | undefined;
}

interface SpiderListPageState {
    spiders: SpiderList[];
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
    PAGE_SIZE = 10;
    state: SpiderListPageState = {
        spiders: [],
        spiderStats: [],
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
    spiderId: string = this.props.match.params.spiderId;

    async componentDidMount(): Promise<void> {
        this.setState({ loaded: true });
        this.getSpiderStatsAndUpdateDates();
    }

    getSpiderStatsAndUpdateDates = async (
        startDate?: string | undefined | null,
        endDate?: string | undefined | null,
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
                sid: "1",
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
        this.getSpiderStatsAndUpdateDates(startDateUTC, endDateUTC);
    };

    onRefreshEventHandler = async () => {
        await this.getSpiderStatsAndUpdateDates();
    };

    render(): JSX.Element {
        const {
            loaded,
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
                        <Row className="lg:m-8 m-4">
                            <Col className="">
                                <p className="text-xl font-medium text-silver float-left">SPIDERS</p>
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
