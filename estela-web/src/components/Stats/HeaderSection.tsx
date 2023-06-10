import React, { Component } from "react";
import { DatePicker, Button, Divider } from "antd";
import moment from "moment";
import Run from "../../assets/icons/run.svg";
import { Row } from "antd";

const { RangePicker } = DatePicker;

type RangeValue = Parameters<NonNullable<React.ComponentProps<typeof DatePicker.RangePicker>["onChange"]>>[0];

interface HeaderChartProps {
    onRefreshEventHandler: React.MouseEventHandler<HTMLElement> | undefined;
    onChangeDateRangeHandler: ((values: RangeValue, formatString: [string, string]) => void) | undefined;
}

export class HeaderSection extends Component<HeaderChartProps, unknown> {
    render() {
        const { onRefreshEventHandler, onChangeDateRangeHandler } = this.props;

        return (
            <>
                <Row className="w-full flow-root items-center justify-end space-x-4 space-x-reverse">
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
                        className="flex float-right items-center rounded-3xl text-sm font-medium stroke-estela border-estela hover:stroke-estela bg-estela-blue-low text-estela hover:text-estela hover:border-estela"
                        onClick={onRefreshEventHandler}
                    >
                        Refresh
                    </Button>
                </Row>
                <Divider className="bg-estela-black-low mb-5" />
            </>
        );
    }
}
