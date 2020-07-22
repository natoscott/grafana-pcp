import { PmapiQuery, TargetFormat } from '../lib/types';
import { DataSourceJsonData, DataQuery } from '@grafana/data';

export interface VectorOptions extends DataSourceJsonData {
    hostspec?: string;
    retentionTime?: string;
}

export interface VectorQuery extends DataQuery, PmapiQuery {}

export const defaultVectorQuery: Partial<VectorQuery> = {
    expr: '',
    format: TargetFormat.TimeSeries,
};
