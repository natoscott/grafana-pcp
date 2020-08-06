import { TargetFormat } from '../lib/models/pcp';
import { DataSourceJsonData } from '@grafana/data';
import { Script } from './script';
import { PmapiQuery } from '../lib/models/pmapi';

export interface BPFtraceOptions extends DataSourceJsonData {
    hostspec?: string;
    retentionTime?: string;
}

export interface BPFtraceQuery extends PmapiQuery {}

export const defaultBPFtraceQuery = {
    expr: '',
    format: TargetFormat.TimeSeries,
};

export interface BPFtraceTargetData {
    script: Script;
}
