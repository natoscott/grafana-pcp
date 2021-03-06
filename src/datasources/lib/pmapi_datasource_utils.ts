import { getTemplateSrv } from '@grafana/runtime';
import { isBlank } from './utils';
import { defaults } from 'lodash';
import { DataQueryRequest, MetricFindValue } from '@grafana/data';
import { PmApi } from './pmapi';
import { PmapiQuery, CompletePmapiQuery } from './models/pmapi';

export function buildQueries<Q extends PmapiQuery>(
    request: DataQueryRequest<Q>,
    defaultQuery: Partial<Q>,
    defaultUrl?: string,
    defaultHostspec?: string
): CompletePmapiQuery[] {
    return request.targets
        .map(target => defaults(target, defaultQuery))
        .filter(target => !target.hide && !isBlank(target.expr))
        .map(target => {
            const url = target.url ?? defaultUrl;
            const hostspec = target.hostspec ?? defaultHostspec;
            if (isBlank(url)) {
                throw new Error('Please specify a connection URL in the datasource settings or in the query editor.');
            }
            if (isBlank(hostspec)) {
                throw new Error(
                    'Please specify a host specification in the datasource settings or in the query editor.'
                );
            }

            return {
                ...target,
                expr: getTemplateSrv().replace(target.expr.trim(), request.scopedVars),
                url: getTemplateSrv().replace(url!, request.scopedVars),
                hostspec: getTemplateSrv().replace(hostspec!, request.scopedVars),
                targetId: `${request.dashboardId}/${request.panelId}/${target.refId}`,
            };
        })
        .filter(target => {
            // remove targets with container hostspec set to empty string
            // happens in the Vector Container Overview dashboard, when selecting "All" and no containers are present
            return target.hostspec.match(/container=(&|$)/) === null;
        });
}

export async function metricFindQuery(
    pmApi: PmApi,
    url: string,
    query: string,
    options?: any
): Promise<MetricFindValue[]> {
    query = getTemplateSrv().replace(query.trim());
    const metricValues = await pmApi.getMetricValues(url, null, [query]);
    return metricValues.values[0].instances.map(instance => ({ text: instance.value.toString() }));
}

export async function testDatasource(pmApi: PmApi, url: string, hostspec: string) {
    try {
        const context = await pmApi.createContext(url, hostspec);
        const pmcdVersionMetric = await pmApi.getMetricValues(url, context.context, ['pmcd.version']);
        return {
            status: 'success',
            message: `Data source is working, using PCP Version ${pmcdVersionMetric.values[0].instances[0].value}`,
        };
    } catch (error) {
        return {
            status: 'error',
            message: `${error.message}. To use this data source, please configure the URL in the query editor.`,
        };
    }
}
