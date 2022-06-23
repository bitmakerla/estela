import { invalidDataNotification } from "./shared";

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
