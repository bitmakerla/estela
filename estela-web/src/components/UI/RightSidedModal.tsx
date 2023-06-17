// Modal.js
import React, { Component } from "react";

interface RightSidedModalProps {
    open: boolean;
    onClose: () => void;
    children: JSX.Element;
}
export class RightSidedModal extends Component<RightSidedModalProps, unknown> {
    render() {
        const { open, onClose, children } = this.props;
        return (
            <div className={`fixed inset-0 z-50 flex items-center justify-end ${open ? "" : "pointer-events-none"}`}>
                <div
                    className={`w-full h-full bg-black bg-opacity-50 transition-opacity duration-300 ease-in ${
                        open ? "opacity-100" : "opacity-0"
                    }`}
                    onClick={onClose}
                ></div>
                <div
                    className={`w-5/12 h-full overflow-auto bg-white p-6 transition-transform duration-300 ease-in-out ${
                        open ? "translate-x-0" : "translate-x-full"
                    }`}
                >
                    {children}
                </div>
            </div>
        );
    }
}
