import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';
import { RedisQuery, RedisOptions } from './types';
import { DataSourceInstanceSettings, ScopedVars, MetricFindValue, VariableModel } from '@grafana/data';
import { isBlank } from '../lib/utils';
import 'core-js/features/instance/replace-all';
//const log = getLogger('datasource');

export class DataSource extends DataSourceWithBackend<RedisQuery, RedisOptions> {
    constructor(instanceSettings: DataSourceInstanceSettings<RedisOptions>) {
        super(instanceSettings);
    }

    applyAdhocQualifiers(expr: string, variables: VariableModel[]) {
        const adhocQualifiers = variables
            .filter(v => v.type === 'adhoc')
            .flatMap(v => (v as any).filters)
            .map(({ key, operator, value }) => {
                if (operator === '=') {
                    operator = '==';
                }
                const isNumericValue = /^\-?\d+(\.\d+)?$/.test(value);
                const formattedValue = isNumericValue ? value : `"${value}"`;
                return `${key} ${operator} ${formattedValue}`;
            })
            .join(', ');
        if (!adhocQualifiers) {
            return expr;
        }

        // this regex captures metric names with optional qualifiers, and ignores empty qualifiers (whitespace)
        // also works with functions, i.e. rate(kernel.all.sysfork{hostname=="..."})
        const regex = /([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+)(?:{\s*(.*?)\s*})?/g;
        return expr.replaceAll(regex, (_substring: string, metric: string, qualifiers: string) => {
            return qualifiers ? `${metric}{${qualifiers}, ${adhocQualifiers}}` : `${metric}{${adhocQualifiers}}`;
        });
    }

    applyTemplateVariables(query: RedisQuery, scopedVars: ScopedVars): Record<string, any> {
        const expr = getTemplateSrv().replace(query.expr, scopedVars);
        const exprWithAdhocQualifiers = this.applyAdhocQualifiers(expr, getTemplateSrv().getVariables());
        return {
            ...query,
            expr: exprWithAdhocQualifiers,
        };
    }

    filterQuery(query: RedisQuery): boolean {
        return !(query.hide === true || isBlank(query.expr));
    }

    /*query(request: DataQueryRequest<RedisQuery>): Observable<DataQueryResponse> {
        const data = super.query(request);
        data.subscribe({
            next: x => {
                log.debug('query', request, x);
            },
        });
        return data;
    }*/

    async metricFindQuery(query: string, options?: any): Promise<MetricFindValue[]> {
        query = getTemplateSrv().replace(query.trim());
        return await this.getResource('metricFindQuery', { query });
    }

    async getTagKeys(options?: any): Promise<MetricFindValue[]> {
        return await this.getResource('getLabelNames');
    }

    async getTagValues(options: any): Promise<MetricFindValue[]> {
        return await this.getResource('getLabelValues', { name: options.key });
    }
}
