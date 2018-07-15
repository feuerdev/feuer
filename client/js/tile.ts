/**
 * Created by geller on 11.09.2016.
 */

export default class Tile {

    private x: number;
    private y: number;
    private z: number;

    private color: string;
    private visible: boolean;

    constructor(x,y,z) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.color = setColor(this.z);
        this.visible = true;
    }

};

function setColor(z) {
    if(z < 0.6) {
        return "#0000A0";
    } else if(z < 0.65) {
        return "#1589FF";
    } else if(z < 0.66) {
        return "#FDD017";
    } else if(z < 0.74) {
        return "#348017";
    } else if(z < 0.9) {
        return "#254117";
    } else if(z < 0.95) {
        return "#837E7C";
    } else {
        return "#FFFFFF";
    }
}