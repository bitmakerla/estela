import React, { Component } from "react";
import { Row, Spin } from "antd";

import "./styles.scss";

export class CustomSpin extends Component<{ className?: string }, unknown> {
    render(): JSX.Element {
        return (
            <Row className={`mt-6 ${this.props.className}`}>
                <Spin size="large" className="mx-auto" />
            </Row>
        );
    }
}
