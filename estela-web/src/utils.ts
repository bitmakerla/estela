import { invalidDataNotification } from "./shared";

export interface BytesMetric {
    quantity: number;
    type: string;
}

export interface Duration {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
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

export function setValArr({ arr, val, index }: { arr: number[]; val: number; index: number }): number[] {
    arr.fill(val, index, index + 1);
    return arr;
}

export function parseDuration(duration: string | undefined): Duration {
    if (duration && duration !== "undefined") {
        const durationRegex = /(?:(\d+) days?,\s*)?(\d{1,2}):(\d{1,2}):(\d{1,2})(?:\.(\d+))?/;
        const matches = duration.match(durationRegex);
        if (!matches) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 };
        }
        const [, daysStr, hoursStr, minutesStr, secondsStr, millisecondsStr] = matches;
        const days = parseInt(daysStr || "0", 10);
        const hours = parseInt(hoursStr, 10);
        const minutes = parseInt(minutesStr, 10);
        const seconds = parseInt(secondsStr, 10);
        const milliseconds = parseInt(millisecondsStr || "0", 10);
        return {
            days,
            hours,
            minutes,
            seconds,
            milliseconds,
        };
    }
    return { days: 0, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 };
}

export function durationToString(duration: Duration): string {
    let str = duration.days > 0 ? `${duration.days} days, ` : "";
    str += duration.hours > 0 ? `${duration.hours}` : "0";
    str += duration.minutes > 0 ? `:${duration.minutes.toString().padStart(2, "0")}` : ":00";
    str += duration.seconds > 0 ? `:${duration.seconds.toString().padStart(2, "0")}` : ":00";
    if (duration.milliseconds > 0) str += `.${duration.milliseconds.toString().padStart(3, "0")}`;
    return str;
}

export function durationToSeconds(duration: Duration): number {
    const { days, hours, minutes, seconds, milliseconds } = duration;
    return days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds + milliseconds / 1000;
}

export function secondsToDuration(seconds: number): Duration {
    const milliseconds = seconds * 1000;

    const days = Math.floor(milliseconds / 86400000);
    const remainingMilliseconds = milliseconds % 86400000;

    const hours = Math.floor(remainingMilliseconds / 3600000);
    const remainingMillisecondsAfterHours = remainingMilliseconds % 3600000;

    const minutes = Math.floor(remainingMillisecondsAfterHours / 60000);
    const remainingMillisecondsAfterMinutes = remainingMillisecondsAfterHours % 60000;

    const secondsInDuration = Math.floor(remainingMillisecondsAfterMinutes / 1000);
    const millisecondsInDuration = remainingMillisecondsAfterMinutes % 1000;

    return {
        days,
        hours,
        minutes,
        seconds: secondsInDuration,
        milliseconds: millisecondsInDuration,
    };
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
