import { LightningElement, api, track, wire } from 'lwc';

export default class ResourceEstimatorRow extends LightningElement {
    @api role;
    @api resources;
    @api isHeader;
}