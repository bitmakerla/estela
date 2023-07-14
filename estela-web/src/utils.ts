import { invalidDataNotification } from "./shared";

export interface BytesMetric {
    quantity: number;
    type: string;
}

function completeDateInfo(data: number): string {
    if (data < 10) {
        return `0${data}`;
    }
    return data.toString();
}

export function convertDateToString(date: Date | undefined): string {
    if (date) {
        const yearUTC = date.getUTCFullYear();
        const monthUTC = completeDateInfo(date.getUTCMonth() + 1);
        const dayUTC = completeDateInfo(date.getUTCDate());
        const hourUTC = date.getUTCHours();
        const minutesUTC = completeDateInfo(date.getUTCMinutes());
        const secondsUTC = completeDateInfo(date.getUTCSeconds());
        return `${hourUTC}:${minutesUTC}:${secondsUTC} ${monthUTC}-${dayUTC}-${yearUTC} UTC`;
    }
    return "";
}

export function formatSecondsToHHMMSS(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.round(seconds) % 60;
    const formattedTime = [
        hours.toString().padStart(2, "0"),
        minutes.toString().padStart(2, "0"),
        remainingSeconds.toString().padStart(2, "0"),
    ].join(":");
    return formattedTime;
}

export function setValArr({ arr, val, index }: { arr: number[]; val: number; index: number }): number[] {
    arr.fill(val, index, index + 1);
    return arr;
}

export function parseDurationToSeconds(durationString: string | undefined): number {
    if (durationString) {
        const [hours, minutes, seconds] = durationString.split(":").map(Number);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        return totalSeconds;
    }
    return 0;
}

export function sumArr(arr: number[]): number {
    return arr.reduce((acc, curr) => acc + curr, 0);
}

export function formatBytes(bytes: number): BytesMetric {
    if (!+bytes) {
        return {
            quantity: 0,
            type: "Bytes",
        };
    }

    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return {
        quantity: parseFloat((bytes / Math.pow(1024, i)).toFixed(2)),
        type: `${sizes[i > sizes.length - 1 ? 3 : i]}`,
    };
}

export function handleInvalidDataError(error: unknown): void {
    if (error instanceof Response) {
        error
            .json()
            .then((data) => ({
                data: data,
                status: error.status,
            }))
            .then((res) => {
                Object.keys(res.data).forEach((key) => {
                    const errors: unknown = res.data[key];
                    if (typeof errors === "string") {
                        invalidDataNotification(errors);
                    } else if (errors instanceof Array) {
                        errors.forEach((error) => invalidDataNotification(error));
                    }
                });
            });
    } else {
        console.error("Unexpected error", error);
    }
}
