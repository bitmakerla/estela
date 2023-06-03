import React, { Component } from "react";
import { DatePicker, Button, Divider, Layout, Tabs } from "antd";
import type { RangePickerProps } from "antd/es/date-picker";
import moment from "moment";
import Run from "../../assets/icons/run.svg";
import { ApiService, GlobalStats, SpidersJobsStats } from "../../services";
import { StatType } from "../../shared";
import { Row } from "antd";
import { Chart } from "./ChartSection";

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

interface HeaderSectionState {
    statOptionTab: StatType;
    statsStartDate: moment.Moment;
    statsEndDate: moment.Moment;
}

export class HeaderSection extends Component<HeaderChartProps, HeaderSectionState> {
    apiService = ApiService();

    state: HeaderSectionState = {
        statOptionTab: StatType.JOBS,
        statsStartDate: moment().subtract(7, "days").startOf("day"),
        statsEndDate: moment(),
    };

    onStatsTabChange: (activeStat: string) => void = (activeStat: string) => {
        switch (activeStat) {
            case "JOBS":
                this.setState({ statOptionTab: StatType.JOBS });
                break;
            case "PAGES":
                this.setState({ statOptionTab: StatType.PAGES });
                break;
            case "ITEMS":
                this.setState({ statOptionTab: StatType.ITEMS });
                break;
            case "RUNTIME":
                this.setState({ statOptionTab: StatType.RUNTIME });
                break;
            case "COVERAGE":
                this.setState({ statOptionTab: StatType.COVERAGE });
                break;
            case "SUCCESS_RATE":
                this.setState({ statOptionTab: StatType.SUCCESS_RATE });
                break;
            case "STATUS_CODE":
                this.setState({ statOptionTab: StatType.STATUS_CODE });
                break;
            default:
                this.setState({ statOptionTab: StatType.LOGS });
                break;
        }
    };

    render() {
        const { onRefreshEventHandler, onChangeDateRangeHandler } = this.props;
        const { statsStartDate, statsEndDate, statOptionTab, stats } = this.state;

        return (
            <>
                <Row className="flow-root items-center justify-end space-x-4 space-x-reverse">
                    <RangePicker
                        onChange={onChangeDateRangeHandler}
                        defaultValue={[statsStartDate, statsEndDate]}
                        ranges={{
                            Today: [moment(), moment()],
                            "Last 72h": [moment().subtract(3, "days").startOf("day"), moment()],
                            "Last 7 Days": [moment().subtract(7, "days").startOf("day"), moment()],
                            "Last 14 Days": [moment().subtract(14, "days").startOf("day"), moment()],
                            "Last 30 Days": [moment().subtract(30, "days").startOf("day"), moment()],
                        }}
                        format="YYYY-MM-DD"
                        className="statDateRangePicker flex float-right w-60 items-center rounded-lg font-medium stroke-white border-estela-blue-full hover:stroke-estela bg-estela-blue-low"
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
                        defaultActiveKey={"optionTab"}
                        onChange={this.onStatsTabChange}
                        items={[
                            {
                                label: "Jobs",
                                key: StatType.JOBS,
                                children: <Chart data={stats} />,
                            },
                            {
                                label: "Pages",
                                key: StatType.PAGES,
                                children: <Chart data={stats} />,
                            },
                            {
                                label: "Items",
                                key: StatType.ITEMS,
                                children: <Chart data={stats} />,
                            },
                            {
                                label: "Runtime",
                                key: StatType.RUNTIME,
                                children: <Chart data={stats} />,
                            },
                            {
                                label: "Coverage",
                                key: StatType.COVERAGE,
                                children: <Chart data={stats} />,
                            },
                            {
                                label: "Success rate",
                                key: StatType.SUCCESS_RATE,
                                children: <Chart data={stats} />,
                            },
                            {
                                label: "Status code",
                                key: StatType.STATUS_CODE,
                                children: <Chart data={stats} />,
                            },
                            {
                                label: "Logs",
                                key: StatType.LOGS,
                                children: <Chart data={stats} />,
                            },
                        ]}
                    />
                </Content>
            </>
        );
    }
}
