import React, { Component } from "react";
import { DatePicker, Button, Divider } from "antd";
import moment from "moment";
import Run from "../../assets/icons/run.svg";
import { Row } from "antd";
import { ProjectHealth, RightSidedModal } from "..";
import { BytesMetric } from "../../utils";
import { ProjectStats } from "../../services";

const { RangePicker } = DatePicker;

type RangeValue = Parameters<NonNullable<React.ComponentProps<typeof DatePicker.RangePicker>["onChange"]>>[0];

interface HeaderSectionProps {
    formattedNetwork: BytesMetric;
    formattedStorage: BytesMetric;
    processingTime: number;
    stats: ProjectStats[];
    loadedStats: boolean;
    startDate: string;
    endDate: string;
    onRefreshEventHandler: React.MouseEventHandler<HTMLElement> | undefined;
    onChangeDateRangeHandler: ((values: RangeValue, formatString: [string, string]) => void) | undefined;
}

interface HeaderSectionState {
    showUsageModal: boolean;
}

export class HeaderSection extends Component<HeaderSectionProps, HeaderSectionState> {
    state: HeaderSectionState = {
        showUsageModal: false,
    };

    render() {
        const {
            onRefreshEventHandler,
            onChangeDateRangeHandler,
            formattedNetwork,
            formattedStorage,
            processingTime,
            stats,
            loadedStats,
            startDate,
            endDate,
        } = this.props;
        const { showUsageModal } = this.state;

        return (
            <>
                <Row className="w-full flow-root items-center justify-end space-x-4">
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
                        className="flex float-left w-60 items-center rounded-lg font-medium stroke-white border-estela-blue-full hover:stroke-estela bg-estela-blue-low"
                    />
                    <Button
                        icon={<Run className="mr-2" width={19} />}
                        className="flex float-left items-center py-3 px-4 rounded-3xl text-sm font-medium stroke-estela border-none bg-estela-blue-low hover:bg-estela-blue-low text-estela hover:stroke-estela hover:text-estela focus:bg-estela-blue-low focus:stroke-estela focus:text-estela"
                        onClick={onRefreshEventHandler}
                    >
                        Refresh
                    </Button>
                    <Button
                        className="flex float-right items-center py-3 px-4 rounded-3xl font-medium bg-estela-blue-full stroke-estela-white-full text-estela-white-full hover:bg-estela-blue-full hover:stroke-estela-white-full hover:text-estela-white-full hover:border-none focus:bg-estela-blue-full focus:stroke-estela-white-full focus:text-estela-white-full focus:border-none"
                        onClick={() => this.setState({ showUsageModal: true })}
                    >
                        See Health &amp; Resources
                    </Button>
                </Row>
                <RightSidedModal open={showUsageModal} onClose={() => this.setState({ showUsageModal: false })}>
                    <ProjectHealth
                        formattedNetwork={formattedNetwork}
                        formattedStorage={formattedStorage}
                        processingTime={processingTime}
                        stats={stats}
                        loadedStats={loadedStats}
                        startDate={startDate}
                        endDate={endDate}
                    />
                </RightSidedModal>
                <Divider className="bg-estela-black-low mb-5" />
            </>
        );
    }
}
