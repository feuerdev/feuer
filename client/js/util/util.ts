import Log from "./log";

export const createSquareArray = function (width) {
    const arr = [];
    for (let i = 0; i < width; i++) {
        arr[i] = [];
    }
    return arr;
};

export const mod = function (n, m) {
    return ((n % m) + m) % m;
};

export function degreeToRadians(angle: number): number {
    return angle * Math.PI / 180;
}
export function radiansToDegrees(angle: number): number {
    return angle * 180 / Math.PI;
}

export function scale(value: number, oldmin: number, oldmax: number, newmin: number, newmax: number): number {
    return (((newmax - newmin) * (value - oldmin)) / (oldmax - oldmin)) + newmin;
}

export function clamp(value: number, min: number, max: number): number {
    return Math.max(Math.min(value, max), min);
}

export const unassigned = function () {
    Log.debug(arguments.callee.caller.name + " is unnassigned");
}
