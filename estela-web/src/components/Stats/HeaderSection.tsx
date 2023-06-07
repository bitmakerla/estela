import React, { Component } from "react";
import { DatePicker, Button, Divider, Layout, Tabs } from "antd";
import moment from "moment";
import Run from "../../assets/icons/run.svg";
import { ApiService, GlobalStats, SpidersJobsStats } from "../../services";
import { StatType } from "../../shared";
import { Row } from "antd";
import { ChartsSection } from "./ChartsSection";

const { RangePicker } = DatePicker;
const { Content } = Layout;

type RangeValue = Parameters<NonNullable<React.ComponentProps<typeof DatePicker.RangePicker>["onChange"]>>[0];

interface HeaderChartProps {
    projectId: string;
    spiderId?: string;
    loadedStats: boolean;
    stats: GlobalStats[] | SpidersJobsStats[];
    onRefreshEventHandler: React.MouseEventHandler<HTMLElement> | undefined;
    onChangeDateRangeHandler: ((values: RangeValue, formatString: [string, string]) => void) | undefined;
}

export class HeaderSection extends Component<HeaderChartProps, unknown> {
    apiService = ApiService();

    render() {
        const { stats, loadedStats, onRefreshEventHandler, onChangeDateRangeHandler } = this.props;

        const reversedStats = stats.slice().reverse();

        return (
            <>
                <Row className="flow-root items-center justify-end space-x-4 space-x-reverse">
                    <RangePicker
                        onChange={onChangeDateRangeHandler}
                        defaultValue={[moment().subtract(7, "days").startOf("day").utc().local(), moment.utc().local()]}
                        ranges={{
                            Today: [moment().startOf("day"), moment().endOf("day")],
                            "Last 72h": [moment().subtract(3, "days").startOf("day"), moment().endOf("day")],
                            "Last 7 Days": [moment().subtract(7, "days").startOf("day"), moment().endOf("day")],
                            "Last 14 Days": [moment().subtract(14, "days").startOf("day"), moment().endOf("day")],
                            "Last 30 Days": [moment().subtract(30, "days").startOf("day"), moment().endOf("day")],
                        }}
                        format="YYYY-MM-DD"
                        className="flex float-right w-60 items-center rounded-lg font-medium stroke-white border-estela-blue-full hover:stroke-estela bg-estela-blue-low"
                    />
                    <Button
                        icon={<Run className="mr-2" width={19} />}
                        className="flex float-right items-center rounded-3xl font-medium stroke-estela border-estela hover:stroke-estela bg-estela-blue-low text-estela hover:text-estela text-sm hover:border-estela"
                        onClick={onRefreshEventHandler}
                    >
                        Refresh
                    </Button>
                </Row>
                <Divider className="bg-estela-black-low mb-5" />
                <Content className="flow-root">
                    <Tabs
                        className="w-full float-right text-estela-black-medium text-xs md:text-sm"
                        items={[
                            {
                                label: "Jobs",
                                key: StatType.JOBS,
                                children: (
                                    <ChartsSection
                                        stats={reversedStats}
                                        loadedStats={loadedStats}
                                        statOption={StatType.JOBS}
                                    />
                                ),
                            },
                            {
                                label: "Pages",
                                key: StatType.PAGES,
                                children: (
                                    <ChartsSection
                                        stats={reversedStats}
                                        loadedStats={loadedStats}
                                        statOption={StatType.PAGES}
                                    />
                                ),
                            },
                            {
                                label: "Items",
                                key: StatType.ITEMS,
                                children: (
                                    <ChartsSection
                                        stats={reversedStats}
                                        loadedStats={loadedStats}
                                        statOption={StatType.ITEMS}
                                    />
                                ),
                            },
                            {
                                label: "Runtime",
                                key: StatType.RUNTIME,
                                children: (
                                    <ChartsSection
                                        stats={reversedStats}
                                        loadedStats={loadedStats}
                                        statOption={StatType.RUNTIME}
                                    />
                                ),
                            },
                            {
                                label: "Coverage",
                                key: StatType.COVERAGE,
                                children: (
                                    <ChartsSection
                                        stats={reversedStats}
                                        loadedStats={loadedStats}
                                        statOption={StatType.COVERAGE}
                                    />
                                ),
                            },
                            {
                                label: "Job success rate",
                                key: StatType.SUCCESS_RATE,
                                children: (
                                    <ChartsSection
                                        stats={reversedStats}
                                        loadedStats={loadedStats}
                                        statOption={StatType.SUCCESS_RATE}
                                    />
                                ),
                            },
                            {
                                label: "Status code",
                                key: StatType.STATUS_CODE,
                                children: (
                                    <ChartsSection
                                        stats={reversedStats}
                                        loadedStats={loadedStats}
                                        statOption={StatType.STATUS_CODE}
                                    />
                                ),
                            },
                            {
                                label: "Logs",
                                key: StatType.LOGS,
                                children: (
                                    <ChartsSection
                                        stats={reversedStats}
                                        loadedStats={loadedStats}
                                        statOption={StatType.LOGS}
                                    />
                                ),
                            },
                        ]}
                    />
                </Content>
            </>
        );
    }
}
