import Log from "./log";

/**
 * Returns a 2d-Array
 */
export const createSquareArray = function(width) {
    const arr = [];
    for (let i=0;i<width;i++) {
        arr[i] = [];
    }
    return arr;
};

/**
 * Wrapper around the %-operator.
 * Returns result even with negative inputs.
 */
export const mod = function(n, m) {
    return ((n % m) + m) % m;
};


/**
 * Placeholder function for debugging purposes
 */
export const unassigned = function() {
    Log.debug(arguments.callee.caller.name+" is unnassigned");    
}
